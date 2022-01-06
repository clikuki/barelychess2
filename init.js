const imgsAreLoaded = new Promise(resolve =>
{
	const imageLoadDiv = document.querySelector('#imageLoad');
	const pieceImgsArray = Object.values(pieceImgs).flat()
	const miscSrcs = [
		'GarryChess.png',
		'LegalMarker.png',
	]

	const imgArray = pieceImgsArray.concat(miscSrcs.map(imageFromSrc));
	imageLoadDiv.append(...imgArray);

	const checkImgLoad = () =>
	{
		if (imgArray.every(img => img.complete)) resolve();
		else requestAnimationFrame(checkImgLoad);
	}
	checkImgLoad();
})

const canvas = document.querySelector('#board');
const FEN_STARTING = 'ETASDZOQKOZDSATE/PPYWLJCUUCJLWYPP/16/16/16/16/16/16/16/16/16/16/16/16/ppywljcuucjlwypp/etasdzoqkozdsate w QKqk - 0 0';
const board = new Board(canvas, FEN_STARTING);
const mouse = { x: 0, y: 0 };

canvas.addEventListener('mousemove', (e) =>
{
	mouse.x = e.offsetX;
	mouse.y = e.offsetY;
})

canvas.addEventListener('mousedown', () =>
{
	if (board.winner) return;

	const file = Math.floor(mouse.x / 49);
	const rank = -Math.floor(mouse.y / 49 - 15);
	const index = Board.fileRankToIndex(file, rank);
	const pieceOnTile = board.tiles[index];

	if (pieceOnTile)
	{
		board.selectedPiece = pieceOnTile;
		board.legalTiles = board.attackedTiles.filter(({ startTile }) => startTile === index);
	}
})

canvas.addEventListener('mouseup', () =>
{
	if (!board.selectedPiece) return;

	const file = Math.floor(mouse.x / 49);
	const rank = -Math.floor(mouse.y / 49 - 15);
	const index = Board.fileRankToIndex(file, rank);
	const pieceOnTile = board.tiles[index];

	// Only place down piece if in legal tiles
	if (!pieceOnTile || pieceOnTile.clr !== board.selectedPiece.clr)
	{
		const selectedPieceIndex = Board.fileRankToIndex(board.selectedPiece.file, board.selectedPiece.rank);
		board.selectedPiece.setFileAndRank(file, rank);
		board.tiles[index] = board.selectedPiece;
		board.tiles[selectedPieceIndex] = null;
		board.pieceIndices.splice(board.pieceIndices.findIndex(i => i === selectedPieceIndex), 1, index);
	}

	// Return selected piece to original tile
	board.legalTiles = [];
	board.selectedPiece.returnToTile();
	board.selectedPiece = null;
})
// ?.clr === board.curSide
// if (board.legalTiles.some(move => move.targetTile === index))
// 	{
// 		const move = board.legalTiles.find(({ targetTile }) => targetTile === index);
// 		board.makeMove(move);
// 		board.attackedTiles = board.generateLegalMoves();
// 	}

const gameLoop = () =>
{
	// Move selected piece to mouse
	if (board.selectedPiece)
	{
		board.selectedPiece.x = mouse.x - 49 / 2;
		board.selectedPiece.y = mouse.y - 49 / 2;
	}

	board.draw()

	requestAnimationFrame(gameLoop);
}

imgsAreLoaded.then(gameLoop)
