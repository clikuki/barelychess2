/**
 * just adding this to get some info on canvas methods with vscode
 * @type {HTMLCanvasElement}
 */
let c = document.getElementById("board");
let ctx = c.getContext("2d")

c.addEventListener("click", (e) =>
{
	clickX = Math.floor(e.offsetX / posMultiplier);
	clickY = Math.floor(e.offsetY / posMultiplier);
	click(clickX, clickY);
})
