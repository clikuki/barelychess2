class Piece
{
	constructor(type, clr, file, rank)
	{
		this.type = type;
		this.clr = clr;
		this.img = pieceInfo[type].imgs[clr];
		this.moveGen = pieceInfo[type].moveGen;
		// File and rank: game position
		// x and y: canvas position
		this.file = file;
		this.rank = rank;
		this.returnToTile();
	}

	draw(ctx)
	{
		ctx.drawImage(this.img, this.x, this.y);
	}

	getMoves()
	{
		return this.moveGen?.apply(this) || [];
	}

	setFileAndRank(file, rank)
	{
		this.file = file;
		this.rank = rank;
		this.returnToTile();
	}

	// Reset x and y of piece
	returnToTile()
	{
		this.x = this.file * 49;
		this.y = (15 - this.rank) * 49;
	}
}

function imageFromSrc(src)
{
	x = new Image();
	x.src = `imgs/${src}`;
	return x;
}

const genPiece = (type, clr) => (file, rank) => new Piece(type, clr, file, rank);

const pieceInfo =
{
	Rook: { symbol: 'R', moveGen: slidingPieceGen },
	Knight: { symbol: 'N', moveGen: knightMoveGen },
	Bishop: { symbol: 'B', moveGen: slidingPieceGen },
	Queen: { symbol: 'Q', moveGen: slidingPieceGen },
	King: { symbol: 'K', moveGen: aroundMoveGen },
	Pawn: { symbol: '', moveGen: pawnMoveGen },
	Blocker: { symbol: 'B', moveGen: slidingPieceGen },
	Peasant: { symbol: 'PS', moveGen: slidingPieceGen },
	Priest: { symbol: 'PR', moveGen: slidingPieceGen },
	Squire: { symbol: 'SQ', moveGen: slidingPieceGen },
	Archer: { symbol: 'A', moveGen: slidingPieceGen },
	LiterateKnight: { symbol: 'L', moveGen: knightMoveGen },
	Edgedancer: { symbol: 'E', moveGen: combine(edgeToEdgeMoveGen, aroundMoveGen) },
	SuperPawn: { symbol: 'SP', moveGen: pawnMoveGen },
	Croissant: { symbol: 'C', moveGen: pawnMoveGen },
	Jumper: { symbol: 'J', moveGen: checkersMoveGen },
	Leaper: { symbol: 'LP', moveGen: checkersMoveGen },
	Lancer: { symbol: 'LA', moveGen: pawnMoveGen },
	Warlock: { symbol: 'W', moveGen: pawnMoveGen },
	Spy: { symbol: 'S', moveGen: pawnMoveGen },
};

for (const pieceName in pieceInfo)
{
	const srcArray = [`${pieceName}White.png`, `${pieceName}Black.png`];
	const imgArray = srcArray.map(src => imageFromSrc(src));
	pieceInfo[pieceName].imgs = imgArray;
}

const getPiece = {
	// White pieces
	R: genPiece('Rook', 0),
	N: genPiece('Knight', 0),
	B: genPiece('Bishop', 0),
	Q: genPiece('Queen', 0),
	K: genPiece('King', 0),
	P: genPiece('Pawn', 0),
	E: genPiece('Edgedancer', 0),
	S: genPiece('Squire', 0),
	T: genPiece('LiterateKnight', 0),
	L: genPiece('Lancer', 0),
	O: genPiece('Blocker', 0),
	A: genPiece('Archer', 0),
	C: genPiece('Croissant', 0),
	U: genPiece('SuperPawn', 0),
	Y: genPiece('Spy', 0),
	J: genPiece('Jumper', 0),
	I: genPiece('Leaper', 0),
	D: genPiece('Priest', 0),
	W: genPiece('Warlock', 0),
	Z: genPiece('Peasant', 0),

	// Black pieces
	r: genPiece('Rook', 1),
	n: genPiece('Knight', 1),
	b: genPiece('Bishop', 1),
	q: genPiece('Queen', 1),
	k: genPiece('King', 1),
	p: genPiece('Pawn', 1),
	e: genPiece('Edgedancer', 1),
	s: genPiece('Squire', 1),
	t: genPiece('LiterateKnight', 1),
	l: genPiece('Lancer', 1),
	o: genPiece('Blocker', 1),
	a: genPiece('Archer', 1),
	c: genPiece('Croissant', 1),
	u: genPiece('SuperPawn', 1),
	y: genPiece('Spy', 1),
	j: genPiece('Jumper', 1),
	i: genPiece('Leaper', 1),
	d: genPiece('Priest', 1),
	w: genPiece('Warlock', 1),
	z: genPiece('Peasant', 1),
}
