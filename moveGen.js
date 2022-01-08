const getMoveObj = (startTile) => (targetTile, special = null) => ({
	startTile,
	targetTile,
	special,
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

const checkIfAtEdge = (file, rank) => [file, rank].some(n => [0, 15].includes(n));

const checkIfTileIsCapturable = (targetTile, clr) =>
{
	const pieceOnTargetTile = board.tiles[targetTile];

	return pieceOnTargetTile
		&& pieceOnTargetTile.type !== 'Blocker'
		&& pieceOnTargetTile.clr !== this.clr;
}

const checkForEnPassant = (targetTile) => board.enPassant?.spaces?.includes(targetTile);

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

	const startIndex = ['Bishop', 'Blocker', 'Priest'].includes(this.type) ? 4 : 0;
	const endIndex = dirOffsets.length - (['Rook', 'Squire'].includes(this.type) ? 4 : 0);

	for (let dirIndex = startIndex; dirIndex < endIndex; dirIndex++)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];

		let numOfLoops = distFromEdge;
		if (['King', 'Blocker', 'Peasant'].includes(this.type))
		{
			// No vertical movement for peasants
			if (this.type === 'Peasant' && Math.abs(dirOffset) === 16) numOfLoops = 0;
			else numOfLoops = Math.min(1, distFromEdge);
		}
		else if (this.type === 'Squire') numOfLoops = Math.min(2, distFromEdge);
		else if (this.type === 'Archer') numOfLoops = Math.min(4, distFromEdge)
		for (let n = 0; n < numOfLoops; n++)
		{
			const targetTile = startTile + dirOffset * (n + 1);
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!pieceOnTargetTile) moves.push(moveObj);
			else
			{
				if (pieceOnTargetTile.clr === this.clr)
				{
					if (this.type === 'Peasant' && pieceOnTargetTile.type === 'King')
					{
						moveObj.special = 'governmentOverthrow';
					}
					else break;
				}
				else if ([this.type, pieceOnTargetTile.type].includes('Blocker')) break;
				else if (this.type === 'Priest' && pieceOnTargetTile.type !== 'Pawn') break;
				else if (this.type === 'Archer' && dirOffset !== -16) break;

				if (this.type === 'Archer')
				{
					moveObj.shotTile = targetTile;
					moveObj.special = 'archerShot';
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
	const moves = [];

	// Diagonal movement
	if (this.type !== 'Lancer')
	{
		const diagonalIndices = this.clr ? [5, 6] : [4, 7];
		for (const dirIndex of diagonalIndices)
		{
			const dirOffset = dirOffsets[dirIndex];
			const distFromEdge = distFromEdges[startTile][dirIndex];
			const targetTile = startTile + dirOffset;
			const canEnpassant = checkForEnPassant(targetTile);
			const canCapture = checkIfTileIsCapturable(targetTile, this.clr);
			const moveObj = startMoveObj(targetTile, canEnpassant ? 'enPassant' : null);

			if (distFromEdge !== 0)
			{
				if (canCapture || canEnpassant)
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
	if (this.type === 'Lancer') numOfLoops = Infinity;
	else if (!this.hasMoved) numOfLoops = 4;
	numOfLoops = Math.min(numOfLoops, distFromEdges[startTile][vertIndex]);

	for (let n = 0; n < numOfLoops; n++)
	{
		const targetTile = startTile + vertOffset * (n + 1);
		const moveObj = startMoveObj(targetTile, n ? 'multiPush' : null);
		const pieceOnTargetTile = board.tiles[targetTile];

		if (!pieceOnTargetTile)
		{
			if (n) moveObj.jumpedTiles = passedTiles.slice();
			moves.push(moveObj);
			passedTiles.push(targetTile);
		}
		else
		{
			if (this.type === 'Lancer'
				&& pieceOnTargetTile.type !== 'Blocker'
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
	const moves = [];

	for (let dirIndex = 0; dirIndex < dirOffsets.length; dirIndex++)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];

		if (distFromEdge)
		{
			const targetTile = startTile + dirOffset;
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!pieceOnTargetTile || pieceOnTargetTile.clr !== this.clr) moves.push(moveObj);
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

		for (let n = 0; n < distFromEdge; n++)
		{
			const targetTile = startTile + dirOffset * (n + 1);
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];
			const tileAtEdge = checkIfAtEdge(...Board.indexTofileRank(targetTile));

			if (!pieceOnTargetTile)
			{
				if (tileAtEdge) moves.push(moveObj);
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
	if (this.type === 'Jumper')
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
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (!pieceOnTargetTile)
			{
				// Set props for checkers capture
				if (jumpedTile)
				{
					moveObj.jumpedTiles = [jumpedTile];
					moveObj.special = 'checkerJump';
				}

				if (jumpedTile || (!n && !board.wasCheckerCapture)) moves.push(moveObj);
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
