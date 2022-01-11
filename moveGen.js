const getMoveObj = (startTile) => (targetTile) => ({
	startTile,
	targetTile,
})

const isSameMove = (move1, move2) =>
{
	const sameStart = move1.startTile === move2.startTile;
	const sameTarget = move1.targetTile === move2.targetTile;
	return sameStart && sameTarget;
}

const removeDuplicateMoves = (moves) =>
{
	const newArr = [];

	for (const move1 of moves)
	{
		const isDuplicate = newArr.some(move2 => isSameMove(move1, move2));
		if (!isDuplicate)
		{
			newArr.push(move1);
		}
	}

	return newArr;
}

const distFromEdges = (() =>
{
	const distArr = [];

	for (let x = 0; x < 16; x++)
	{
		for (let y = 0; y < 16; y++)
		{
			const westDist = x;
			const eastDist = 15 - x;
			const northDist = 15 - y;
			const southDist = y;

			const index = Board.fileRankToIndex(x, y);
			distArr[index] = [
				northDist,
				eastDist,
				westDist,
				southDist,
				Math.min(northDist, eastDist),
				Math.min(southDist, eastDist),
				Math.min(southDist, westDist),
				Math.min(northDist, westDist),
			]
		}
	}

	return distArr;
})()

const dirOffsets = [
	-16,
	1,
	-1,
	16,
	-15,
	17,
	15,
	-17,
]

const knightJumpIndices = [
	[4, 0],
	[4, 1],
	[5, 3],
	[5, 1],
	[6, 3],
	[6, 2],
	[7, 0],
	[7, 2],
];

const literateKnightJumpIndices = [
	[],
	[4],
	[5],
	[6],
	[7],
	[0],
	[1],
	[2],
	[3],
	[0, 0],
	[1, 1],
	[2, 2],
	[3, 3],
	[0, 0, 0],
	[1, 1, 1],
	[2, 2, 2],
	[3, 3, 3],
].concat(knightJumpIndices);

const checkIfAtEdge = (file, rank) => [file, rank].some(n => [0, 15].includes(n));

const checkIfTileIsCapturable = (targetTile, clr) =>
{
	const pieceOnTargetTile = board.tiles[targetTile];

	return pieceOnTargetTile
		&& !pieceOnTargetTile.is('Blocker')
		&& pieceOnTargetTile.clr !== clr;
}

const checkForEnCroissant = (targetTile) =>
{
	const canEnCroissant = board.enMoves?.spaces?.includes(targetTile);
	return canEnCroissant;
}

const checkForEnPassant = (targetTile) => board.enMoves?.isPawnPush && checkForEnCroissant(targetTile);

// Returns a function that executes all move generators passed to it
const combine = (...moveGens) => function ()
{
	const moves = moveGens.reduce((acc, cur) => acc.concat(cur.apply(this)), []);
	return removeDuplicateMoves(moves);
}

// Handles move generation for pieces with simple sliding moves
function slidingPieceGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	const startIndex = ['Bishop', 'Priest'].includes(this.type) ? 4 : 0;
	const endIndex = dirOffsets.length - (['Rook', 'Squire'].includes(this.type) ? 4 : 0);

	for (let dirIndex = startIndex; dirIndex < endIndex; dirIndex++)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];
		const passedTiles = [];

		let numOfLoops = distFromEdge;
		if (this.is('Queen') && board.collectivistGovernment[this.clr]) numOfLoops = Math.min(1, distFromEdge);
		else if (this.is('Squire')) numOfLoops = Math.min(2, distFromEdge);
		else if (this.is('Archer')) numOfLoops = Math.min(4, distFromEdge);
		for (let n = 0; n < numOfLoops; n++)
		{
			const targetTile = startTile + dirOffset * (n + 1);
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!pieceOnTargetTile)
			{
				moveObj.passedTiles = passedTiles.slice();
				moves.push(moveObj);
				passedTiles.push(targetTile);
			}
			else
			{
				if (pieceOnTargetTile.clr === this.clr) break;
				else if ([this.type, pieceOnTargetTile.type].includes('Blocker')) break;
				else if (this.is('Priest') && !pieceOnTargetTile.is('Pawn')) break;
				else if (this.is('Archer') && dirOffset !== -16) break;

				if (this.is('Archer'))
				{
					moveObj.shotTile = targetTile;
					moveObj.isArcherShot = true;
				};

				moves.push(moveObj);
				break;
			}
		}
	}

	return moves;
}

function pawnMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const isLancer = this.is('Lancer');
	const moves = [];

	// Diagonal movement
	if (!isLancer)
	{
		const diagonalIndices = this.clr ? [5, 6] : [4, 7];
		for (const dirIndex of diagonalIndices)
		{
			const dirOffset = dirOffsets[dirIndex];
			const targetTile = startTile + dirOffset;
			const distFromEdge = distFromEdges[startTile][dirIndex];
			const canEnpassant = checkForEnPassant(targetTile);
			const canEnCroissant = this.is('Croissant') && checkForEnCroissant(targetTile);
			const isEnMove = canEnpassant || canEnCroissant;
			const canCapture = checkIfTileIsCapturable(targetTile, this.clr);
			const moveObj = startMoveObj(targetTile);
			moveObj.isEnMove = isEnMove;

			if (canEnpassant) moveObj.isEnPassant = true;
			else if (canEnCroissant) moveObj.isEnCroissant = true;

			if (distFromEdge !== 0)
			{
				if ((!this.is('Croissant') && canCapture)
					|| canEnCroissant || canEnpassant)
				{
					moves.push(moveObj);
				}
			}
		}
	}

	// vertical movement
	const vertIndex = this.clr ? 3 : 0;
	const vertOffset = dirOffsets[vertIndex];
	const passedTiles = [];

	let numOfLoops = 2;
	if (isLancer) numOfLoops = Infinity;
	else if (!this.hasMoved) numOfLoops = 4;
	numOfLoops = Math.min(numOfLoops, distFromEdges[startTile][vertIndex]);

	for (let n = 0; n < numOfLoops; n++)
	{
		const targetTile = startTile + vertOffset * (n + 1);
		const newDistFromEdge = distFromEdges[targetTile][vertIndex];
		const pieceOnTargetTile = board.tiles[targetTile];
		const moveObj = startMoveObj(targetTile);

		if (!newDistFromEdge) moveObj.isPromotion = true;
		if (n)
		{
			moveObj.isMultiPush = true;
			moveObj.passedTiles = passedTiles.slice();
		}

		if (!pieceOnTargetTile)
		{
			moves.push(moveObj);
			passedTiles.push(targetTile);
		}
		else
		{
			if (isLancer
				&& !pieceOnTargetTile.is('Blocker')
				&& pieceOnTargetTile.clr !== this.clr)
			{
				moves.push(moveObj);
			}

			break;
		}
	}

	return moves;
}

function aroundMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const isPeasant = this.is('Peasant');
	const moves = [];

	for (let dirIndex = 0; dirIndex < dirOffsets.length; dirIndex++)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];

		if (distFromEdge && (!isPeasant || Math.abs(dirOffset) !== 16))
		{
			const targetTile = startTile + dirOffset;
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!this.is('Blocker') || !pieceOnTargetTile)
			{
				if (pieceOnTargetTile && pieceOnTargetTile.clr === this.clr)
				{
					if (isPeasant && pieceOnTargetTile.is('King'))
					{
						moveObj.isGovernmentOverthrow = true;
						moves.push(moveObj);
					}
				}
				else moves.push(moveObj);
			}
		}
	}

	return moves;
}

function castlingMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	for (let side = 0; side < 2; side++)
	{
		const canCastle = board.castling[this.clr][side];

		if (canCastle)
		{
			const dirIndex = side ? 1 : 2;
			const dirOffset = dirOffsets[dirIndex];
			const passedTiles = [];
			let targetTile = startTile;
			let pieceInWay = false;
			let rookSpace;

			for (let n = 0; n < 4; n++)
			{
				targetTile += dirOffset;

				if (n !== 3) passedTiles.push(targetTile);
				if (n === 2) rookSpace = targetTile;

				const pieceOnTargetTile = board.tiles[targetTile];
				if (pieceOnTargetTile && pieceOnTargetTile.clr === this.clr)
				{
					pieceInWay = true;
					break;
				}
			}

			if (pieceInWay) break;
			const moveObj = startMoveObj(targetTile);
			moveObj.passedTiles = passedTiles;
			moveObj.isCastling = true;
			moveObj.side = side;
			moveObj.rookSpace = rookSpace;
			moves.push(moveObj);
		}
	}

	return moves;
}

function edgeToEdgeMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	for (let dirIndex = 0; dirIndex < dirOffsets.length - 4; dirIndex++)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];
		const passedTiles = [];

		for (let n = 0; n < distFromEdge; n++)
		{
			const targetTile = startTile + dirOffset * (n + 1);
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];
			const tileAtEdge = checkIfAtEdge(...Board.indexTofileRank(targetTile));

			if (!pieceOnTargetTile)
			{
				if (tileAtEdge)
				{
					if (passedTiles.length)
					{
						moveObj.passedTiles = passedTiles.slice();
					}

					moves.push(moveObj);
				}

				passedTiles.push(targetTile);
			}
			else if (pieceOnTargetTile.clr === this.clr) break;
			else if (tileAtEdge)
			{
				moves.push(moveObj);
				break;
			}
			else break;
		}
	}

	return moves;
}

// after capturing, jumpers and leapers can do a 1-square diagonal move.
// not sure whether to change this or not
function checkersMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	let dirIndices = [4, 5, 6, 7];
	if (this.is('Jumper'))
	{
		if (this.clr) dirIndices = [5, 6];
		else dirIndices = [4, 7];
	}

	for (const dirIndex of dirIndices)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];
		const numOfLoops = Math.min(2, distFromEdge);
		let jumpedTile = null;

		for (let n = 0; n < numOfLoops; n++)
		{
			const targetTile = startTile + dirOffset * (n + 1);
			const distFromTop = distFromEdges[targetTile][0];
			const distFromBottom = distFromEdges[targetTile][3];
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!pieceOnTargetTile)
			{
				if (jumpedTile)
				{
					moveObj.passedTiles = [jumpedTile];
					moveObj.isCheckerJump = true;
				}

				if (jumpedTile || (!n && !board.wasCheckerCapture))
				{
					if (!this.is('Leaper') && (!distFromTop || !distFromBottom))
					{
						moveObj.isPromotion = true;
					}

					moves.push(moveObj);
				}

				if (!jumpedTile) break;
				else jumpedTile = null;
			}
			else if (pieceOnTargetTile.clr !== this.clr)
			{
				jumpedTile = targetTile;
			}
		}
	}

	return moves;
}

function knightMoveGen()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	const jumpIndicesArray = this.is('Knight') ? knightJumpIndices : literateKnightJumpIndices;

	for (const jumpIndices of jumpIndicesArray)
	{
		let targetTile = startTile;
		let hitsWall = false;
		for (const jumpIndex of jumpIndices)
		{
			const distFromEdge = distFromEdges[targetTile][jumpIndex];
			if (!distFromEdge)
			{
				hitsWall = true;
				break;
			}
			else targetTile += dirOffsets[jumpIndex];
		}

		const moveObj = startMoveObj(targetTile);
		const pieceOnTargetTile = board.tiles[targetTile];
		if (!hitsWall && (!pieceOnTargetTile || pieceOnTargetTile.clr !== this.clr))
		{
			moves.push(moveObj);
		}
	}

	return moves;
}
