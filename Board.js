class Board
{
	constructor(startingFen, width = 0, height = 0)
	{
		this.tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
		this.width = width;
		this.height = height;
		this.collectivistGovernment = [false, false]; // [white, black]
		this.castlingAvailability = [[true, true], [true, true]]; // [[white queenside, white kingside], [black queenside, black kingside]]
		this.enPassantTargets = null;
		this.enPassantPiece = null;
		this.enPassantCounter = 0;
		this.gameNotation = '';
		this.turnNumber = 1;
		this.whoseTurn = 0;
		this.specialTurnType = '';
		this.selectedPiece = null;
		this.moveCounter = {
			half: 0,
			full: 0,
		}

		if (startingFen) loadFen(startingFen, this);
	}

	draw(ctx)
	{
		this.tiles.forEach((row, y) => row.forEach((piece, x) =>
		{
			// Draw tile
			ctx.fillStyle = ((x + y) % 2 === 0) ? '#ecdab9' : '#ae8a68'
			ctx.fillRect(x * posMultiplier, y * posMultiplier, x * posMultiplier + posMultiplier, y * posMultiplier + posMultiplier)

			// Draw piece if there are any
			if (piece != null) ctx.drawImage(piece.image, x * posMultiplier, y * posMultiplier);
		}))
	}

	move(x1, y1, x2, y2)
	{
		const oldPiece = this.tiles[y1][x1];
		this.tiles[y1][x1] = null;
		this.tiles[y2][x2] = oldPiece;
	}

	colorOn(x, y)
	{
		return this.tiles[y][x] ?? null;
	}
}

function loadFen(fenString, board)
{
	// Not sure what to do with en passant field
	const [piecePlacement, curSide, castlingRights, enPassant, halfMoves, fullMoves] = fenString.split(' ');

	// set move counter
	board.moveCounter.halfMoves = halfMoves;
	board.moveCounter.fullMoves = fullMoves;

	// Set current side
	board.whoseTurn = (curSide === 'w') ? 0 : 1;

	// Set castling rights
	board.castlingAvailability = [[false, false], [false, false]];
	castlingRights.split('').forEach(char =>
	{
		let side = 0;
		let type = 0;
		if (char.toLowerCase() !== char) side = 1;
		if (char.toLowerCase() === 'k') type = 1;
		board.castlingAvailability[side][type] = true;
	})

	// Set pieces
	board.tiles = [];
	piecePlacement.split('/').forEach((row, yLoc) =>
	{
		board.tiles[yLoc] = [];

		let xLoc = 0;
		let spaceStr = '';
		for (let i = 0; i < row.length; i++)
		{
			const char = row[i];
			if (!isNaN(+char)) spaceStr += char;
			else
			{
				// Add spaces
				const spaces = Array.from({ length: +spaceStr }, () => null);
				board.tiles[yLoc].push(...spaces);
				spaceStr = '';

				// Add piece
				board.tiles[yLoc][xLoc] = fenMap[char](xLoc, yLoc);
				xLoc++;
			}
		}

		// Add leftover spaces
		const spaces = Array.from({ length: +spaceStr }, () => null);
		board.tiles[yLoc].push(...spaces);
	})
}

// returns all en passant (or en croissant) targets on a line from (startX, startY) to (endX, endY).
// does not include the points (startX, startY) and (endX, endY) themselves.
function passantTargets(startX, startY, endX, endY)
{
	deltaX = Math.abs(endX - startX)
	deltaY = Math.abs(endY - startY)

	let moveGcd = gcd(deltaX, deltaY)

	let xStep = deltaX / moveGcd * Math.sign(endX - startX);
	let yStep = deltaY / moveGcd * Math.sign(endY - startY);

	targets = [];
	checkX = startX + xStep;
	checkY = startY + yStep;

	while (!(checkX === endX && checkY === endY))
	{
		targets.push([checkX, checkY])
		checkX += xStep
		checkY += yStep
	}

	return targets;
}

function gcd(a, b)
{
	a = Math.abs(a);
	b = Math.abs(b);

	if (b > a) [a, b] = [b, a];

	while (true)
	{
		if (b === 0) return a;
		a %= b;
		if (a === 0) return b;
		b %= a;
	}
}

function imageFromSrc(src)
{
	x = new Image();
	x.src = `imgs/${src}`;
	return x;
}

const posMultiplier = 49;

function click(clickX, clickY)
{
	if (selectedPiece === null && board[clickY][clickX] == null) return;
	if (selectedPiece === null && board[clickY][clickX] != null)
	{
		if ((board[clickY][clickX].color != whoseTurn)
			|| (specialTurnType === 'jumper' && board[clickY][clickX].name != 'Jumper')
			|| (specialTurnType === 'warlock' && PAWN_LIKE_PIECES.includes(board[clickY][clickX].name) && board[clickY][clickX].name != 'Warlock')) return;

		const legalMoves = board[clickY][clickX].legalMoves();
		if (legalMoves.length === 0) return;
		selectedPiece = board[clickY][clickX]
		for (m of legalMoves)
		{
			ctx.drawImage(legalMarkerImage, m[0] * posMultiplier, m[1] * posMultiplier)
		}
	}
	else
	{
		if (selectedPiece.canMoveToLegal(clickX, clickY))
		{
			specialTurnType = '';

			const special = selectedPiece.specialModifier(clickX, clickY)
			const oldX = selectedPiece.x;
			const oldY = selectedPiece.y;

			if (board[clickY][clickX] != null && board[clickY][clickX].name === 'Edgedancer')
			{
				if (clickX === 0 && castlingAvailability[1 - selectedPiece.color][0])
				{
					castlingAvailability[1 - selectedPiece.color][0] = false;
				}
				else if (clickX === 15 && castlingAvailability[1 - selectedPiece.color][1])
				{
					castlingAvailability[1 - selectedPiece.color][1] = false;
				}
			}

			if (special === 100)
			{
				gameNotation += (selectedPiece.algebraicNotation(selectedPiece.x, selectedPiece.y, clickX, clickY) + ' ')
				whoseTurn = (1 - whoseTurn);
				selectedPiece.moveTo(selectedPiece.x, selectedPiece.y, clickX, clickY)
			}
			else if (selectedPiece.isPassantMove(clickX, clickY))
			{
				gameNotation += (selectedPiece.algebraicNotation(clickX, clickY, enPassantPiece.x, enPassantPiece.y) + ' ')
				whoseTurn = (1 - whoseTurn);
				selectedPiece.moveTo(clickX, clickY, enPassantPiece.x, enPassantPiece.y)
				enPassantCounter += 1;
			}
			else if (special === 150)
			{
				specialTurnType = 'jumper'
				gameNotation += (selectedPiece.algebraicNotation(clickX, clickY, selectedPiece.auxArgument(clickX, clickY, 3), selectedPiece.auxArgument(clickX, clickY, 4)))
				selectedPiece.moveTo(clickX, clickY, selectedPiece.auxArgument(clickX, clickY, 3), selectedPiece.auxArgument(clickX, clickY, 4))
				if (selectedPiece.legalMoves().length === 0)
				{
					specialTurnType = '';
					whoseTurn = 1 - whoseTurn;
				}
			}
			else
			{
				if (isOccupied([clickX, clickY]) && board[clickY][clickX].name === 'King')
				{
					collectivistGovernment[board[clickY][clickX].color] = true;
				}
				if (special === 250)
				{
					specialTurnType = 'warlock'
					gameNotation += (selectedPiece.algebraicNotation(clickX, clickY) + ',')
				}
				else
				{
					whoseTurn = (1 - whoseTurn);
					gameNotation += (selectedPiece.algebraicNotation(clickX, clickY) + ' ')
				}
				selectedPiece.moveTo(clickX, clickY)
			}

			if (special === 200)
			{
				selectedPiece.internalCounter++;
				if (selectedPiece.name === 'Priest' && selectedPiece.internalCounter === 4)
				{
					selectedPiece.remove();
				}
			}

			if (!LEAPERS.includes(selectedPiece.name))
			{
				enPassantTargets = passantTargets(oldX, oldY, clickX, clickY);
				enPassantPiece = selectedPiece;
			}

			if (selectedPiece.name === 'King')
			{
				castlingAvailability[selectedPiece.color] = [false, false]
			}
			else if (selectedPiece.name === 'Rook')
			{
				if (selectedPiece.y === 0 && castlingAvailability[selectedPiece.color][0])
				{
					castlingAvailability[selectedPiece.color][0] = false;
				}
				else if (selectedPiece.x === 7 && castlingAvailability[selectedPiece.color][1])
				{
					castlingAvailability[selectedPiece.color][1] = false;
				}
			}

			if (selectedPiece.name === 'Spy')
			{
				selectedPiece.image = imageFromSrc((selectedPiece.color === 0 ? 'PawnWhite.png' : 'PawnBlack.png'))
			}

			if (special > 0)
			{
				if (selectedPiece.name === 'King')
				{
					if (special === 1)
					{
						board[clickY][0].moveTo(5, clickY)
					}
					else if (special === 2)
					{
						board[clickY][15].moveTo(11, clickY)
					}
				}
			}

			if (PAWN_LIKE_PIECES.includes(selectedPiece.name) && (selectedPiece.y === 0 || selectedPiece.y === 15))
			{
				if (selectedPiece.name === 'Jumper') selectedPiece.replaceWith('Leaper');
				else
				{
					promotedPiece = null;
					pickedValidPiece = false;
					isFirstAttempt = true;
					while (!pickedValidPiece)
					{
						promotedPiece = prompt(isFirstAttempt ? 'Enter the piece you\'d like to promote to. Use full names, like \"Queen\" or \"Literate Knight\". If your piece comes out invisible, just blame the fact that it\'s 11:30 PM right now and I don\'t have time to fix bugs like that. It\'ll reappear once the opponent makes a move.' : 'That is not a valid piece. (use full names, like \"Queen\" or \"Literate Knight\")', 'Queen');
						if (PROMOTABLE_PIECES.includes(promotedPiece))
						{
							pickedValidPiece = true;
						}
						else if (collectivistGovernment[selectedPiece.color] && promotedPiece === 'King')
						{
							if (selectedPiece.beingAttacked())
							{
								alert('No way, that would start the king in check!');
							}
							else
							{
								pickedValidPiece = true;
							}
						}

						isFirstAttempt = false;
					}
					selectedPiece.replaceWith(promotedPiece);
					if (promotedPiece === 'King')
					{
						collectivistGovernment[selectedPiece.color] = false;
					}
				}
			}
		}

		drawBoard(board);
		notationElem.innerText = gameNotation;
		selectedPiece = null;
	}

	if (enPassantCounter >= 12)
	{
		ctx.drawImage(imageFromSrc('GarryChess.png'), 0, 0);
		gameNotation += ' 0-0-1 (Garry Chess wins)';
		notationElem.innerText = gameNotation;
	}
}
