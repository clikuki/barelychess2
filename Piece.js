class Piece
{
	constructor(type, clr, file, rank)
	{
		this.type = type;
		this.clr = clr;
		this.img = pieceImgs[type][clr];
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

const pieceImgs = Object.fromEntries(
	Object.keys(pieceInfo).map(piece =>
	{
		const srcArray = [`${piece}White.png`, `${piece}Black.png`];
		return [piece, srcArray.map(src => imageFromSrc(src))];
	})
);

const getPiece = {
	// White pieces
	r: genPiece('Rook', 0),
	n: genPiece('Knight', 0),
	b: genPiece('Bishop', 0),
	q: genPiece('Queen', 0),
	k: genPiece('King', 0),
	p: genPiece('Pawn', 0),
	e: genPiece('Edgedancer', 0),
	s: genPiece('Squire', 0),
	t: genPiece('LiterateKnight', 0),
	l: genPiece('Lancer', 0),
	o: genPiece('Blocker', 0),
	a: genPiece('Archer', 0),
	c: genPiece('Croissant', 0),
	u: genPiece('SuperPawn', 0),
	y: genPiece('Spy', 0),
	j: genPiece('Jumper', 0),
	i: genPiece('Leaper', 0),
	d: genPiece('Priest', 0),
	w: genPiece('Warlock', 0),
	z: genPiece('Peasant', 0),

	// Black pieces
	R: genPiece('Rook', 1),
	N: genPiece('Knight', 1),
	B: genPiece('Bishop', 1),
	Q: genPiece('Queen', 1),
	K: genPiece('King', 1),
	P: genPiece('Pawn', 1),
	E: genPiece('Edgedancer', 1),
	S: genPiece('Squire', 1),
	T: genPiece('LiterateKnight', 1),
	L: genPiece('Lancer', 1),
	O: genPiece('Blocker', 1),
	A: genPiece('Archer', 1),
	C: genPiece('Croissant', 1),
	U: genPiece('SuperPawn', 1),
	Y: genPiece('Spy', 1),
	J: genPiece('Jumper', 1),
	I: genPiece('Leaper', 1),
	D: genPiece('Priest', 1),
	W: genPiece('Warlock', 1),
	Z: genPiece('Peasant', 1),
}
