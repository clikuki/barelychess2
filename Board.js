class Board
{
	constructor(canvas, loadingFen)
	{
		// Set dimensions of canvas
		canvas.width = 784;
		canvas.height = 784;

		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.tiles = Array.from({ length: 256 }, () => null);
		this.pieceIndices = [];
		this.moveCounter = [0, 0];
		this.enPassant = null;
		this.curSide = 0;
		this.kings = [null, null];
		this.castling = [[null, null], [null, null]];
		this.collectivistGovernment = [false, false];
		this.enPassantCounter = 0;
		this.gameNotation = '';
		this.attackedTiles = [];
		this.legalTiles = [];
		this.lastMoves = [];
		this.selectedPiece = null;
		this.winner = null;

		// Load pieces
		if (loadingFen) this.load(loadingFen);
	}

	draw()
	{
		// Draw board
		for (let file = 0; file < 16; file++)
		{
			for (let rank = 0; rank < 16; rank++)
			{
				const x = file * 49;
				const y = rank * 49;
				this.ctx.fillStyle = ((file + rank) % 2) ? '#ae8a68' : '#ecdab9';
				this.ctx.fillRect(x, y, 49, 49);
			}
		}

		// Draw legal move highlights
		if (this.selectedPiece)
		{
			const selectedPieceIndex = Board.fileRankToIndex(this.selectedPiece.file, this.selectedPiece.rank);
			const indices = [selectedPieceIndex, ...this.legalTiles.map(({ targetTile }) => targetTile)];

			this.ctx.fillStyle = '#FFFF0095';
			indices.forEach(index =>
			{
				const [file, rank] = Board.indexTofileRank(index);
				const x = file * 49;
				const y = (15 - rank) * 49;
				this.ctx.fillRect(x, y, 49, 49);
			})
		}

		// Draw last move
		this.ctx.fillStyle = '#00FF0055';
		const lastMove = this.lastMoves[this.lastMoves.length - 1];
		if (lastMove)
		{
			[lastMove.startTile, lastMove.targetTile].forEach(i =>
			{
				const [file, rank] = Board.indexTofileRank(i);
				const x = file * 49;
				const y = (15 - rank) * 49;
				this.ctx.fillRect(x, y, 49, 49);
			})
		}

		// Draw pieces
		this.pieceIndices.forEach(i => this.tiles[i].draw(this.ctx))

		// Draw selected piece on top of other pieces
		if (this.selectedPiece) this.selectedPiece.draw(this.ctx);
	}

	load(fen)
	{
		// TODO: Handle en Passant field
		const [placement, side, castling, enPassantInfo, halfMove, fullMove] = fen.split(' ');

		// set pieces
		placement.split('/').forEach((row, rank) =>
		{
			// Correct rank num
			rank = 15 - rank;

			let space = '';
			let file = 0;
			const addSpaces = (num) =>
			{
				for (let i = 0; i < num; i++)
				{
					this.tiles[Board.fileRankToIndex(file++, rank)] = null;
				}
				space = '';
			}

			for (const char of row)
			{
				if (!isNaN(+char)) space += char;
				else
				{
					addSpaces(+space);

					// Add piece
					const pieceIndex = Board.fileRankToIndex(file, rank);
					const piece = getPiece[char](file++, rank);
					this.tiles[pieceIndex] = piece;
					this.pieceIndices.push(pieceIndex);
					if (piece.type === 'King') this.kings[piece.clr] = piece;
				}
			}

			// Add leftover spaces
			addSpaces(+space);
		});

		// Set castling rights
		castling.split('').forEach(char =>
		{
			const lowerCase = char.toLowerCase();
			const clrSide = lowerCase === char ? 1 : 0;
			const castlingSide = lowerCase === 'k' ? 1 : 0;
			const file = castlingSide ? 15 : 0;
			const rank = clrSide ? 15 : 0;
			const piece = this.tiles[Board.fileRankToIndex(file, rank)];

			if (piece) this.castling[clrSide][castlingSide] = piece;
		})

		// Set en passant info
		if (enPassantInfo !== '-')
		{
			// Change to fen: en passant field now stands for the
			// pawn's position, not the space behind it as Chess 2
			// pawns can move 3 or more spaces ahead
			const index = Board.notationToFileRank(enPassantInfo);
			const target = this.tiles[index];
			this.enPassant = {
				target,
				// TODO: Add en passant space array
				spaces: [],
			}
		}

		// Set current side
		this.curSide = (side === 'w') ? 0 : 1;

		// Set move counter
		this.moveCounter = [halfMove, fullMove];
	}

	generateMoves()
	{
		const semiLegal = [];

		this.pieceIndices.forEach(index =>
		{
			const piece = this.tiles[index];
			if (piece.clr === board.curSide) semiLegal.push(...piece.getMoves());
		})

		return semiLegal;
	}

	makeMove(move)
	{
		const pieceToMove = this.tiles[move.startTile];
		const pieceToCapture = this.tiles[move.targetTile];

		// Update indices
		this.pieceIndices.splice(this.pieceIndices.findIndex(pi => pi === move.startTile), 1);
		if (!pieceToCapture) this.pieceIndices.push(move.targetTile);

		// Update tiles
		this.tiles[move.startTile] = null;
		this.tiles[move.targetTile] = pieceToMove;

		// Update piece position
		pieceToMove.setFileAndRank(...Board.indexTofileRank(move.targetTile));

		board.curSide = +!board.curSide;
		this.lastMoves.push(move);
	}

	// Position converters
	static fileRankToIndex(file, rank)
	{
		return 240 + file - (rank * 16);
	}

	static indexTofileRank(i)
	{
		const file = i % 16;
		const rank = 15 - ((i - file) / 16);
		return [file, rank];
	}

	static notationToFileRank(str)
	{
		const file = fileMap[str[0]];
		const rank = 16 - +str.slice(1);
		return [file, rank];
	}

	static fileRankToNotation(file, rank)
	{
		let notation = '';

		// Get file str
		for (const fileChar in fileMap)
		{
			if (fileMap[fileChar] === file)
			{
				notation += fileChar;
				break;
			}
		}

		// Get rank
		notation += 16 - rank;

		return notation;
	}
}

const fileMap = {
	a: 0,
	b: 1,
	c: 2,
	d: 3,
	e: 4,
	f: 5,
	g: 6,
	h: 7,
	i: 8,
	j: 9,
	k: 10,
	l: 11,
	m: 12,
	n: 13,
	o: 14,
	p: 15,
}
