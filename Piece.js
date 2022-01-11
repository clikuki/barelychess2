class Piece
{
	constructor(type, clr, file, rank)
	{
		this.type = type;
		this.symbol = pieceInfo[type].symbol;
		this.fenChar = pieceInfo[type].fenChar[clr];
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

	getIndex()
	{
		return Board.fileRankToIndex(this.file, this.rank)
	}

	is(type)
	{
		return this.type === type;
	}
}

function imageFromSrc(src)
{
	x = new Image();
	x.src = `imgs/${src}`;
	return x;
}

const genPiece = (type, clr) => (file, rank) => new Piece(type, clr, file, rank);

const promoteMap = {
	rook: 'r',
	knight: 'n',
	bishop: 'b',
	queen: 'q',
	king: 'k',
	blocker: 'b',
	peasant: 'z',
	priest: 'd',
	squire: 's',
	archer: 'a',
	literateKnight: 't',
	edgedancer: 'e',
}

const pieceInfo =
{
	Rook: { fenChar: ['R', 'r'], symbol: 'R', moveGen: slidingPieceGen },
	Knight: { fenChar: ['N', 'n'], symbol: 'N', moveGen: knightMoveGen },
	Bishop: { fenChar: ['B', 'b'], symbol: 'B', moveGen: slidingPieceGen },
	Queen: { fenChar: ['Q', 'q'], symbol: 'Q', moveGen: slidingPieceGen },
	King: { fenChar: ['K', 'k'], symbol: 'K', moveGen: combine(aroundMoveGen, castlingMoveGen) },
	Pawn: { fenChar: ['P', 'p'], symbol: '', moveGen: pawnMoveGen },
	Blocker: { fenChar: ['O', 'o'], symbol: 'B', moveGen: aroundMoveGen },
	Peasant: { fenChar: ['Z', 'z'], symbol: 'PS', moveGen: aroundMoveGen },
	Priest: { fenChar: ['D', 'd'], symbol: 'PR', moveGen: slidingPieceGen },
	Squire: { fenChar: ['S', 's'], symbol: 'SQ', moveGen: slidingPieceGen },
	Archer: { fenChar: ['A', 'a'], symbol: 'A', moveGen: slidingPieceGen },
	LiterateKnight: { fenChar: ['T', 't'], symbol: 'L', moveGen: knightMoveGen },
	Edgedancer: { fenChar: ['E', 'e'], symbol: 'E', moveGen: combine(edgeToEdgeMoveGen, aroundMoveGen) },
	SuperPawn: { fenChar: ['U', 'u'], symbol: 'SP', moveGen: pawnMoveGen },
	Croissant: { fenChar: ['C', 'c'], symbol: 'C', moveGen: pawnMoveGen },
	Jumper: { fenChar: ['J', 'j'], symbol: 'J', moveGen: checkersMoveGen },
	Leaper: { fenChar: ['I', 'i'], symbol: 'LP', moveGen: checkersMoveGen },
	Lancer: { fenChar: ['L', 'l'], symbol: 'LA', moveGen: pawnMoveGen },
	Warlock: { fenChar: ['W', 'w'], symbol: 'W', moveGen: pawnMoveGen },
	Spy: { fenChar: ['Y', 'y'], symbol: 'S', moveGen: pawnMoveGen },
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
