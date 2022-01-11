class Board
{
	constructor(canvas, loadingFen)
	{
		// Set dimensions of canvas
		canvas.width = 784;
		canvas.height = 784;

		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.garryChessImg = imageFromSrc('GarryChess.png');
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
		this.wasWarlockEnpassant = false;

		// Load pieces
		if (loadingFen) this.load(loadingFen);
	}

	draw()
	{
		// Garry chess wins
		if (this.winner === 2)
		{
			const width = this.canvas.width;
			const height = this.canvas.height;
			this.ctx.drawImage(this.garryChessImg, 0, 0, width, height);
		}
		else
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
	}

	load(fen)
	{
		// TODO: Make move counter actually work
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
			const lowerCaseChar = char.toLowerCase();
			const clrSide = lowerCaseChar === char ? 1 : 0;
			const castlingSide = lowerCaseChar === 'k' ? 1 : 0;
			const file = castlingSide ? 15 : 0;
			const rank = clrSide ? 15 : 0;
			const index = Board.fileRankToIndex(file, rank);
			const piece = this.tiles[index];
			if (piece) this.castling[clrSide][castlingSide] = piece;
		})

		// Set en passant info
		// TODO: Make en Passant field actually work
		if (enPassantInfo !== '-')
		{
			// Change to fen: en passant field now stands for the
			// pawn's position, not the space behind it as Chess 2
			// pawns can move 3 or more spaces ahead
			const index = Board.notationToFileRank(enPassantInfo);
			const target = this.tiles[index];
			this.enMoves = {
				target,
				spaces: [],
			}
		}

		// Set current side
		this.curSide = (side === 'w') ? 0 : 1;

		// Set move counter
		// this.moveCounter = [+halfMove, +fullMove];
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

	generateLegalMoves()
	{
		const semiLegalMoves = this.generateMoves();
		if (this.collectivistGovernment[this.curSide]) return semiLegalMoves;
		const king = this.kings[this.curSide];
		const oldKingIndex = Board.fileRankToIndex(king.file, king.rank);
		const legalMoves = [];
		const protectedPriests = this.getProtectedPriests();

		for (const moveObj of semiLegalMoves)
		{
			if (protectedPriests.includes(moveObj.targetTile)) continue;
			this.makeMove(moveObj, true);

			const opponentResponses = this.generateMoves();
			let isLegalMove = true;
			for (const opponentMove of opponentResponses)
			{
				const newKingIndex = Board.fileRankToIndex(king.file, king.rank);

				if (opponentMove.targetTile === newKingIndex)
				{
					isLegalMove = false;
					break;
				}

				if (moveObj.isCastling)
				{
					const passedTiles = moveObj.passedTiles;
					if ([oldKingIndex, ...passedTiles].includes(opponentMove.targetTile))
					{
						isLegalMove = false;
						break;
					}
				}
			}

			this.unmakeMove();

			if (isLegalMove)
			{
				// Exit early if warlock en passant is a legal move
				if (this.tiles[moveObj.startTile].is('Warlock') && moveObj.isEnMove)
				{
					return [moveObj];
					break;
				}

				legalMoves.push(moveObj);
			}
		}

		return legalMoves;
	}

	makeMove(moveObj, noBlock)
	{
		if (!noBlock) console.log('move made!');
		const [targetFile, targetRank] = Board.indexTofileRank(moveObj.targetTile);
		let movedPiece = null;
		if (moveObj.startTile !== moveObj.targetTile
			&& moveObj.targetTile !== moveObj.shotTile)
		{
			movedPiece = this.tiles[moveObj.startTile];
		}

		// Remove captured piece
		let capturedPieceIndex;
		let capturedPiece;
		if (this.tiles[moveObj.targetTile]) capturedPieceIndex = moveObj.targetTile;
		else if (moveObj.isArcherShot) capturedPieceIndex = moveObj.shotTile;
		else if (moveObj.isEnMove) capturedPieceIndex = this.enMoves.target;
		else if (moveObj.isCheckerJump) capturedPieceIndex = moveObj.passedTiles[0];
		if (capturedPieceIndex)
		{
			capturedPiece = this.tiles[capturedPieceIndex];
			moveObj.captured = {
				piece: this.tiles[capturedPieceIndex],
				index: capturedPieceIndex,
			}
			this.removePiece(capturedPieceIndex);
		}
		else moveObj.captured = null;

		if (movedPiece)
		{
			// Change spy img
			if (movedPiece?.is('Spy') && !movedPiece.hasMoved)
			{
				const pawnImg = pieceInfo.Pawn.imgs[movedPiece.clr];
				movedPiece.img = pawnImg;
			}
			else if (movedPiece.is('Peasant') && capturedPiece === this.kings[this.curSide])
			{
				moveObj.prevCollectivistGovernment = dupeObj(this.collectivistGovernment);
				this.collectivistGovernment[this.curSide] = true;
			}
			else if (movedPiece.is('King'))
			{
				moveObj.prevCastling = dupeObj(this.castling);
				if (moveObj.isCastling)
				{
					const rook = this.castling[this.curSide][moveObj.side];
					const oldRookSpace = rook.getIndex();
					const newRookSpace = moveObj.rookSpace;
					this.removePiece(oldRookSpace);
					this.setPiece(rook, newRookSpace);
					rook.hasMoved = true;
					moveObj.isCastling = {
						oldIndex: oldRookSpace,
						newIndex: newRookSpace,
						rook,
					}
				}

				this.castling[this.curSide] = [null, null];
			}
			else if ([movedPiece?.type, capturedPiece?.type].includes('Edgedancer'))
			{
				moveObj.prevCastling = dupeObj(this.castling);
				for (const piece of [movedPiece, capturedPiece])
				{
					if (piece && !piece?.hasMoved)
					{
						const castlingSide = this.castling[this.curSide].findIndex(r => r === piece);
						if (castlingSide !== -1) this.castling[this.curSide][castlingSide] = null;
					}
				}
			}
			else if (moveObj.isPromotion)
			{
				moveObj.prevPawn = movedPiece;
				if (movedPiece.is('Jumper'))
				{
					let leaperChar = 'i';
					if (!board.curSide) leaperChar = leaperChar.toUpperCase();
					movedPiece = getPiece[leaperChar](targetFile, targetRank);
				}
				else if (!noBlock)
				{
					const msg = 'Please enter the name of the piece you want to promote to.';
					const canPromoteToKing = this.collectivistGovernment[this.curSide];
					while (true)
					{
						const input = prompt(msg).toLowerCase();
						let pieceChar = promoteMap[input];
						if (pieceChar && (pieceChar !== 'k' || canPromoteToKing))
						{
							if (!board.curSide) pieceChar = pieceChar.toUpperCase();
							movedPiece = getPiece[pieceChar](targetFile, targetRank);
							break;
						}
					}
				}
			}
		}

		// Move piece
		if (movedPiece)
		{
			this.removePiece(moveObj.startTile);
			this.setPiece(movedPiece, moveObj.targetTile);
			moveObj.moved = {
				piece: movedPiece,
				hasMoved: !!movedPiece.hasMoved,
			}
			movedPiece.hasMoved = true;
		}
		else moveObj.moved = null;

		moveObj.prevEnMoves = !this.enMoves ? null : dupeObj(this.enMoves);
		if (moveObj.passedTiles && !moveObj.isCheckerJump && !moveObj.isCastling)
		{
			this.enMoves = {
				isPawnPush: moveObj.isMultiPush,
				spaces: moveObj.passedTiles,
				target: moveObj.targetTile,
			}
		}
		else this.enMoves = null;

		moveObj.prevWarlockEnpassant = this.wasWarlockEnpassant;
		if (moveObj.isWarlockEnpassant
			&& (noBlock || confirm(extraTurnMsg)))
		{
			this.wasWarlockEnpassant = true;
		}
		else this.wasWarlockEnpassant = false;

		if (moveObj.isEnMove) this.enPassantCounter++;
		if (!noBlock && this.enPassantCounter === 12)
		{
			this.winner = 2;
			alert('Both players have taken 12 en passant captures! As stated by the rules of chess 2, Garry Chess, the memetic "creator" of chess will now cameo and win the game (In online chess this means the game ends in a draw).');
		}

		moveObj.prevSide = board.curSide;
		if (!moveObj.isCheckerJump && !this.wasWarlockEnpassant) this.switchSide();
		this.wasCheckerCapture = moveObj.isCheckerJump;
		this.lastMoves.push(moveObj);
	}

	unmakeMove()
	{
		const moveObj = this.lastMoves.pop();
		if (!moveObj) return;
		board.curSide = moveObj.prevSide;
		const pieceToMove = moveObj.moved?.piece || null;

		if (pieceToMove)
		{
			// Change spy img
			if (pieceToMove.is('Spy') && !moveObj.moved.hasMoved)
			{
				const spyImg = pieceInfo.Spy.imgs[pieceToMove.clr];
				pieceToMove.img = spyImg;
			}
			else if (moveObj.prevCollectivistGovernment)
			{
				this.collectivistGovernment = moveObj.prevCollectivistGovernment;
			}
			else if (moveObj.isCastling)
			{
				const rook = moveObj.isCastling.rook;
				const oldRookSpace = moveObj.isCastling.oldIndex;
				const newRookSpace = moveObj.isCastling.newIndex;
				this.removePiece(newRookSpace);
				this.setPiece(rook, oldRookSpace);
				rook.hasMoved = false;
			}
			else if (moveObj.isPromotion)
			{
				moveObj.moved.piece = moveObj.prevPawn;
			}
		}

		// Move back piece
		if (moveObj.moved)
		{
			const piece = moveObj.moved.piece;
			this.removePiece(moveObj.targetTile);
			this.setPiece(piece, moveObj.startTile);
			piece.hasMoved = moveObj.moved.hasMoved;
		}

		// Return captured piece
		if (moveObj.captured)
		{
			const piece = moveObj.captured.piece;
			const index = moveObj.captured.index;
			this.setPiece(piece, index);
		}

		if (moveObj.isEnMove) this.enPassantCounter--;
		this.wasWarlockEnpassant = moveObj.prevWarlockEnpassant;
		this.enMoves = moveObj.prevEnMoves;
		if (moveObj.prevCastling) this.castling = moveObj.prevCastling;
	}

	getProtectedPriests()
	{
		return this.pieceIndices.filter(i =>
		{
			const piece = this.tiles[i];
			const file = piece.file;
			const rank = piece.rank;
			if (!piece.is('Priest')) return false;

			const pieceChars = ['q', 'r', 'b', 'l', 't', 'n', 'k', 'p', 'z', 'e', 'y', 's', 'w', 'c', 'j', 'i', 'a']
				.map(c => piece.clr ? c.toUpperCase() : c);

			for (const pieceChar of pieceChars)
			{
				const fakePiece = getPiece[pieceChar](file, rank);
				const fakeMoves = fakePiece.getMoves();

				for (const moveObj of fakeMoves)
				{
					const pieceOnTargetTile = this.tiles[moveObj.targetTile];
					if (pieceOnTargetTile?.fenChar.toLowerCase() === pieceChar.toLowerCase())
					{
						return true;
					}
				}
			}

			return false;
		})
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

	setPiece(piece, index)
	{
		const [file, rank] = Board.indexTofileRank(index);
		this.pieceIndices.push(index);
		this.tiles[index] = piece;
		piece.setFileAndRank(file, rank);
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

const extraTurnMsg = 'You played a warlock en passant! Accept extra move?\n\nNote: You can only move pawn-like pieces on the extra turn.'

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
