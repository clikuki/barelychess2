class Piece
{
	constructor(type, clr, file, rank)
	{
		this.type = type;
		this.clr = clr;
		this.img = pieceImgs[type][clr];
		this.moveGen = pieceMoveGen[type];
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

const pieceSymbol =
{
	Rook: 'R',
	Knight: 'N',
	Bishop: 'B',
	Queen: 'Q',
	King: 'K',
	Pawn: '',
	Blocker: 'B',
	Peasant: 'PS',
	Priest: 'PR',
	Squire: 'SQ',
	Archer: 'A',
	LiterateKnight: 'L',
	Edgedancer: 'E',
	SuperPawn: 'SP',
	Croissant: 'C',
	Jumper: 'J',
	Leaper: 'LP',
	Lancer: 'LA',
	Warlock: 'W',
	Spy: 'S',
};

const pieceMoveGen =
{
	Rook: slidingPieceGen(0, 1, 2, 3),
	Knight: null,
	Bishop: slidingPieceGen(4, 5, 6, 7),
	Queen: slidingPieceGen(0, 1, 2, 3, 4, 5, 6, 7),
	King: slidingPieceGen(0, 1, 2, 3, 4, 5, 6, 7), // Incomplete, needs to account for castling
	Pawn: null,
	Blocker: slidingPieceGen(4, 5, 6, 7),
	Peasant: null,
	Priest: slidingPieceGen(4, 5, 6, 7),
	Squire: slidingPieceGen(0, 1, 2, 3),
	Archer: slidingPieceGen(0, 1, 2, 3, 4, 5, 6, 7),
	LiterateKnight: null,
	Edgedancer: null,
	SuperPawn: null,
	Croissant: null,
	Jumper: null,
	Leaper: null,
	Lancer: slidingPieceGen(0), // Incomplete, needs to account for promotion
	Warlock: null,
	Spy: null,
};

const pieceImgs = Object.fromEntries(
	Object.keys(pieceSymbol).map(piece =>
	{
		const srcArray = [`${piece}White.png`, `${piece}Black.png`];
		return [piece, srcArray.map(src => imageFromSrc(src))];
	})
);

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
