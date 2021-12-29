/**
 * just adding this to get some info on canvas methods with vscode
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d")
const imageLoadDiv = document.querySelector('#imageLoad')

canvas.addEventListener("click", (e) =>
{
	clickX = Math.floor(e.offsetX / posMultiplier);
	clickY = Math.floor(e.offsetY / posMultiplier);
	click(clickX, clickY);
})

const pieceSrcs = [
	'Archer',
	'Bishop',
	'Blocker',
	'Croissant',
	'Edgedancer',
	'Jumper',
	'King',
	'Knight',
	'Lancer',
	'Leaper',
	'LiterateKnight',
	'Pawn',
	'Peasant',
	'PeasantPowered',
	'Priest',
	'Queen',
	'Rook',
	'Spy',
	'Squire',
	'SuperPawn',
	'Warlock',
].flatMap(piece => [`${piece}Black.png`, `${piece}White.png`]);

const miscSrcs = [
	'GarryChess.png',
	'LegalMarker.png',
]

const imgs = pieceSrcs.concat(miscSrcs).map(imageFromSrc);

imageLoadDiv.append(...imgs);

// Only draw board when all images are loaded
const checkImgLoad = () =>
{
	if (imgs.every(img => img.complete)) drawBoard(board);
	else requestAnimationFrame(checkImgLoad);
}
checkImgLoad();
