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
		this.enMoves = null;
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
		this.wasCheckerCapture = false;

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

		// Draw legal move highlights
		if (this.selectedPiece)
		{
			const indices = this.legalTiles.map(({ targetTile }) => targetTile);

			this.ctx.fillStyle = '#FFFF0095';
			indices.forEach(index =>
			{
				const [file, rank] = Board.indexTofileRank(index);
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
					if (piece.is('King')) this.kings[piece.clr] = piece;
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
			this.enMoves = {
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

	makeMove(move, noBlock)
	{
		const pieceToMove = this.tiles[move.startTile];
		const pieceToCapture = this.tiles[move.targetTile];
		const [targetFile, targetRank] = Board.indexTofileRank(move.targetTile);

		if (pieceToCapture) move.capturedPiece = pieceToCapture;
		move.pieceFirstMove = !pieceToMove.hasMoved;
		move.prevSide = board.curSide;

		if (move.special === 'archerShot')
		{
			move.shotPiece = this.tiles[move.shotTile];
			this.removePiece(move.shotTile);
		}
		else
		{
			if (pieceToMove !== pieceToCapture)
			{
				// Update indices
				this.pieceIndices.splice(this.pieceIndices.findIndex(pi => pi === move.startTile), 1);
				if (!pieceToCapture) this.pieceIndices.push(move.targetTile);

				// Update tiles
				this.tiles[move.startTile] = null;
				this.tiles[move.targetTile] = pieceToMove;
			}

			// Update piece position
			pieceToMove.setFileAndRank(targetFile, targetRank);

			// Change spy img
			if (pieceToMove.is('Spy'))
			{
				pieceToMove.img = pieceInfo.Pawn.imgs[pieceToMove.clr];
			}

			// Remove passed piece / take en passant
			if (['enPassant', 'enCroissant'].includes(move.special))
			{
				const enPassantPiece = board.enMoves?.target;
				move.capturedPiece = this.tiles[enPassantPiece];
				this.removePiece(enPassantPiece);
			}

			if (pieceToMove.is('Peasant') && pieceToCapture === this.kings[this.curSide])
			{
				move.prevCollectivistGovernment = this.collectivistGovernment.slice();
				this.collectivistGovernment[this.curSide] = true;
			}

			if (pieceToMove.is('King'))
			{
				move.prevCastling = this.castling.map(x => x.slice());

				if (move.special === 'castling')
				{
					const rook = this.castling[this.curSide][move.side];
					const prevRookSpace = Board.fileRankToIndex(rook.file, rook.rank);
					const rookSpace = move.rookSpace;
					const [rookFile, rookRank] = Board.indexTofileRank(rookSpace);
					this.removePiece(prevRookSpace);
					rook.setFileAndRank(rookFile, rookRank);
					this.tiles[rookSpace] = rook;
					this.pieceIndices.push(rookSpace);
					rook.hasMoved = true;
					move.castledRook = rook;
					move.prevRookSpace = prevRookSpace;
				}

				this.castling[this.curSide] = [null, null];
			}

			if ([pieceToMove.type, pieceToCapture?.type].includes('Edgedancer'))
			{
				move.prevCastling = this.castling.map(x => x.slice());

				for (const piece of [pieceToMove, pieceToCapture])
				{
					const castlingSide = this.castling[this.curSide].findIndex(r => r === piece);
					if (castlingSide !== -1)
					{
						this.castling[this.curSide][castlingSide] = null;
					}
				}
			}

			if (move.special?.includes('promotion'))
			{
				let newPiece = move.promoteTo || null;

				if (pieceToMove.is('Jumper'))
				{
					const pieceChar = pieceToMove.clr ? 'i' : 'I';
					newPiece = getPiece[pieceChar](targetFile, targetRank);
				}

				if (!newPiece && !noBlock)
				{
					const caseFunc = pieceToMove.clr ? 'toLowerCase' : 'toUpperCase';
					let firstTime = true;
					while (true)
					{
						const msg = firstTime ?
							'You may promote your pawn! Enter the name of the piece you want to promote to.' :
							'Invalid piece entered, please try again. Enter the name of the piece you want to promote to.';
						firstTime = false;

						const input = prompt(msg, '').toLowerCase();

						if (input)
						{
							let pieceChar = promoteMap[input];
							if (pieceChar && (pieceChar !== 'k' || this.collectivistGovernment[board.curSide]))
							{
								pieceChar = pieceChar[caseFunc]();
								newPiece = getPiece[pieceChar](targetFile, targetRank);
								break;
							}
						}
					}
				}

				if (newPiece)
				{
					newPiece.hasMoved = true;
					this.tiles[move.targetTile] = newPiece;
				}
			}
		}

		// Clear/Set jumped tiles for en passant and en croissant
		if (this.enMoves)
		{
			move.prevEnMoves = this.enMoves;
			this.enMoves = null;
		}

		if (move.passedTiles && move.special !== 'checkerJump') this.enMoves = {
			isPawnPush: move.special === 'multiPush',
			spaces: move.passedTiles,
			target: move.targetTile,
		}

		// Don't switch board control if checker move is done
		// to allow player to capture multiple pieces in a row
		if (move.special?.includes('checkerJump'))
		{
			move.capturedPiece = this.tiles[move.passedTiles[0]];
			this.removePiece(move.passedTiles[0]);
			this.wasCheckerCapture = true;

			// Check if jumper or leaper can still do checker capture
			const nextMoves = pieceToMove.getMoves();
			if (nextMoves.every(m => m.special !== 'checkerJump')) this.switchSide();
		}
		else
		{
			this.switchSide();
			this.wasCheckerCapture = false;
		}

		pieceToMove.hasMoved = true;
		this.lastMoves.push(move);
	}

	unmakeMove()
	{
		const move = this.lastMoves.pop();
		if (!move) return;

		const [startTile, startRank] = Board.indexTofileRank(move.startTile);
		const [targetFile, targetRank] = Board.indexTofileRank(move.targetTile);
		const pieceToMove = this.tiles[move.targetTile] || this.tiles[move.startTile];
		const pieceCaptured = move.capturedPiece;

		if (move.special === 'archerShot')
		{
			this.tiles[move.shotTile] = move.shotPiece;
			this.pieceIndices.push(move.shotTile);
		}
		else
		{
			// Update indices
			this.pieceIndices.push(move.startTile);
			if (!pieceCaptured)
			{
				const pieceIndexIndex = this.pieceIndices.findIndex(pi => pi === move.targetTile);
				this.pieceIndices.splice(pieceIndexIndex, 1);
			}

			// Update tiles
			this.tiles[move.startTile] = pieceToMove;
			this.tiles[move.targetTile] = pieceCaptured;

			// Update piece position
			pieceToMove.setFileAndRank(startTile, startRank);

			// Return castling rights
			if (move.prevCastling)
			{
				this.castling = move.prevCastling;
			}

			// Return spy img
			if (pieceToMove.is('Spy') && move.pieceFirstMove)
			{
				pieceToMove.img = pieceInfo.Spy.imgs[pieceToMove.clr];
			}

			// Undo castling
			if (move.special === 'castling')
			{
				const rook = move.castledRook;
				const prevRookSpace = move.prevRookSpace;
				const [prevRookFile, prevRookRank] = Board.indexTofileRank(prevRookSpace);

				this.removePiece(move.rookSpace);
				this.tiles[prevRookSpace] = rook;
				this.pieceIndices.push(prevRookSpace);
				rook.setFileAndRank(prevRookFile, prevRookRank);
				rook.hasMoved = false;
			}

			if (move.special === 'governmentOverthrow')
			{
				this.collectivistGovernment = move.prevCollectivistGovernment;
			}
		}

		if (move.enMoves) this.enMoves = move.enMoves;

		if (move.pieceFirstMove) pieceToMove.hasMoved = false;

		board.curSide = move.prevSide;
	}

	switchSide()
	{
		return board.curSide = +!board.curSide;
	}

	removePiece(index)
	{
		const pieceIndexIndex = this.pieceIndices.findIndex(pi => pi === index);
		if (pieceIndexIndex !== -1)
		{
			this.pieceIndices.splice(pieceIndexIndex, 1);
			this.tiles[index] = null;
		}
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
