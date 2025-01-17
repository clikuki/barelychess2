const imgsAreLoaded = new Promise(resolve =>
{
	const imageLoadDiv = document.querySelector('#imageLoad');
	const pieceImgsArray = Object.values(pieceInfo).flatMap(({ imgs }) => imgs);
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

const dupeObj = (obj) =>
{
	const isArray = Array.isArray(obj);
	const base = isArray ? [] : {};

	for (const key in obj)
	{
		const item = obj[key];
		if (typeof item === 'object' && item !== null && !(item instanceof Piece))
		{
			base[key] = dupeObj(item);
		}
		else base[key] = item;
	}

	return base;
}

const canvas = document.querySelector('#board');
const FEN_STARTING = 'k6p8/8d7/16/16/16/16/8Q7/16/16/16/16/16/16/16/16/8K7 w - - 0 0';
// const FEN_STARTING = '8k7/16/16/16/16/16/16/16/16/16/16/10q5/16/16/16/E7K6E w QK - 0 0';
// const FEN_STARTING = 'etasdzoqkozdsate/ppywljcuucjlwypp/16/16/16/16/16/16/16/16/16/16/16/16/PPYWLJCUUCJLWYPP/ETASDZOQKOZDSATE w QKqk - 0 0';
const board = new Board(canvas, FEN_STARTING);
const mouse = { x: 0, y: 0 };

const genMove = 'generateLegalMoves';
// const genMove = 'generateMoves';
board.attackedTiles = board[genMove]();

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

	if (pieceOnTile?.clr === board.curSide)
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

	// Only place down piece if in legal tiles
	if (board.legalTiles.some(move => move.targetTile === index))
	{
		const move = board.legalTiles.find(({ targetTile }) => targetTile === index);
		board.makeMove(move);
		board.attackedTiles = board[genMove]();
	}

	// Return selected piece to original tile
	board.legalTiles = [];
	board.selectedPiece.returnToTile();
	board.selectedPiece = null;
})

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
