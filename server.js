const express = require("express")
const fs = require("fs")
const https = require("https")
const NodeCouchDb = require("node-couchdb")
const bodyParser = require("body-parser")
const session = require("express-session")

const couch = new NodeCouchDb()

class Pet 
{
    constructor(name, breed, age, pic)
	{
        this.name = name
        this.breed = breed
        this.age = age
        this.pic = pic
    }
}
class User
{
	constructor(id, pass, name, address, pic, tel, email, is_admin)
	{
        this._id = id
        this.pass = pass

        this.name = name
        this.address = address
        this.pic = pic
        this.tel = tel
        this.email = email
        this.is_admin = is_admin

        this.pets = {}
    }
}

/* Cria um novo usuário no banco de dados.
 Recebe uma instância da classe User que representa o usuário a ser criado */
function createUser(user)
{
	couch.insert("users", user).then(
	({data, headers, status}) => 
	{
		console.log("Usuário com id %s inserido com sucesso.", data.id);
	},
	(err) => console.log(err))
}

function createPet(owner_id, name, breed, age, pic)
{
	couch.get("users", owner_id).then(({data, headers, status}) =>
	{
		let user = data
		if (user.pets[name])
		{
			console.log("Pet de nome %s do usuário %s já existe. Não foi alterado.", owner_id, name)
			return
		}

		user.pets[name] = new Pet(name, breed, age, pic)
		couch.update("users", user).then(({data, headers, status}) =>
		{
			console.log("Pet %s adicionado ao usuário %s com sucesso", name, owner_id)
		},
		err =>
		{
			console.log(err)
			console.log("Erro ao tentar adicionar pet ao usuário %s.", owner_id)
		})
	},
	err => 
	{
		console.log(err)
		console.log("Erro ao tentar adicionar pet ao usuário %s.", owner_id)
	})
}

/* Verifica se o par (id, pass) bate com algum usuário do banco.
 Se sim, chama ok_callback. Caso contrário, err_callback.
 ok_callback recebe um objeto que representa o usuário autenticado
 err_callback recebe uma string com um código identificador do erro
 */
function authenticateUser(id, pass, ok_callback, err_callback)
{
	couch.get("users", id).then(
	function({data, headers, status})
	{
		let user = data
		if (user.pass == pass)
		{
			ok_callback(user)
		}
		else
		{
			err_callback("WRONGPASS")		// Caso senha incorreta
		}
	}, 
	function(err)
	{
		if (err.code == "EDOCMISSING")
			err_callback("NOSUCHUSER")		// Caso usuário inexistente
		else
			err_callback("UNKNOWN")			// Caso qualquer outro erro
	})
	
}

/* Inicialização da database users do CouchDB.
Se a database já existir, nada é alterado.*/
 
couch.createDatabase("users").then(
	function()
	{
		console.log("Database 'users' não encontrada. Será criada e inicializada.")
        
		let userExample1 = new User("usuario1", "1234", "Rodrigo Weigert", "Rua Tiradentes, 123", "images/profiles/profilepic.jpg", "(17) 1234-5678", "rodrigo.weigert@usp.br", false)
		let userExample2 = new User("admin", "admin", "Administrador", null, "images/profiles/profileadmin.png", "(16) 8765-4321", "admin@petstop.com.br", true)
		let petExample1 = new Pet("Kabosu", "Shiba Inu", 1, "images/pets/doge.jpg")
		let petExample2 =  new Pet("Toby", "Bulldog", 2, "images/pets/borkdrive.jpg")

		userExample1.pets[petExample1.name] = petExample1
		userExample1.pets[petExample2.name] = petExample2

        createUser(userExample1)
		createUser(userExample2)
	},
	function(err)
	{
		if (err.code == "EDBEXISTS")
			console.log("Database 'users' já existe, não será alterada.")
		else
			console.log(err.body)
	}
)

const app = express()

// Para o servidor servir tudo o que está no diretório "public" automaticamente.
app.use(express.static("public"))

// Para parsear dados enviados por POST
app.use(bodyParser.urlencoded({extended: true}))

// Para lidar com as sessões dos usuários
app.use(session({secret: "q q eu to fazeno com a minha vida?", resave: false, saveUninitialized: false}))

// Página inicial.
app.get('/', (req, res) => 
{
	res.sendFile(__dirname + "/index.html")
})

// Autenticação
app.post('/login', (req, res) =>
{
	authenticateUser(req.body.login, req.body.pass,
	function(user)
	{
		// Autenticação do usuário realizada com sucesso.
		req.session.user = user
		if (user.is_admin)
			res.redirect('/area_adm')
		else
			res.redirect('/area_usuario')
	},
	function(err)
	{
		// Falha na autenticação
		if (err == "NOSUCHUSER" || err == "WRONGPASS")
			res.redirect('/?falha_login')				// O falha_login na query string é detectado pelo index.js para exibir a mensagem de erro.
		else
			res.status(500).send("Um erro interno do servidor ocorreu.")
	})
})

app.get('/logout', (req, res) =>
{
	req.session.destroy()
	res.redirect('/')
})

// Páginas de usuário e admin.

app.get('/area_usuario', (req, res) =>
{
	if (!req.session.user)
		res.redirect('/')
	else if (req.session.user.is_admin)
		res.redirect('/area_adm')
	else
		res.sendFile(__dirname + "/area_usuario.html")
})

app.get('/area_adm', (req, res) => 
{
	if (!req.session.user)
		res.redirect('/')
	else if (!req.session.user.is_admin)
		res.redirect('/area_usuario')
	else
		res.sendFile(__dirname + "/area_adm.html")
})

// Para oferecimento de dados via AJAX (obtenção dos pets do usuário, por exemplo)

app.get('/userdata', (req, res) => 
{
	res.send(req.session.user)	
})


/* Inicialização dos servidores https e http. */

const https_server = https.createServer({key: fs.readFileSync("ssl/key.pem"), cert: fs.readFileSync("ssl/cert.pem")}, app).listen(8081, function()
{
	let host = https_server.address().address
	let port = https_server.address().port
	console.log("Servidor HTTPS iniciado em https://%s:%s.", host, port)
})


const http_server = app.listen(8080, function()
{
	let host = http_server.address().address
	let port = http_server.address().port
	console.log("Servidor HTTP iniciado em http://%s:%s", host, port)
})
