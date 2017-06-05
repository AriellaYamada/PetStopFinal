
///<reference path="Server.ts"/>

declare var $: any;
var server: Server = new Server()

function changePage(page: number) : void
{

	let i: number = 0;
	let p: number = (page-1) * 9;

	$(".active").attr("class", "");
	$("#page" + page).attr("class", "active");

	for (i = 1; i <= 9; i++){
		$(".product" + i).each(function()
		{
			try
			{
				$("#product" + i + "image").attr("src", server.products[i-1+p].pic);
				$("#product" + i + "name").html(server.products[i-1+p].name);
				$("#product" + i + "desc").html(server.products[i-1+p].description);
				$("#product" + i + "price").html("R$" + server.products[i-1+p].price.toFixed(2).replace(".", ","));
			}
			catch (e)
			{
				$("#product" + i + "image").attr("src", "");
				$("#product" + i + "name").html("");
				$("#product" + i + "desc").html("");
				$("#product" + i + "price").html("");
			}
		})
	}
}

function modalFunc(): void
{
	$("#modal1name").html(server.products[0].name);
	$("#modal1image").attr("src", server.products[0].pic);
	$("#modal1desc").html(server.products[0].description);
	$("#modal1prices").html(server.products[0].price);
}