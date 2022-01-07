const getMoveObj = (startTile) => (targetTile, special = null) => ({
	startTile,
	targetTile,
	special,
})

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

// Returns a function that executes all move generators passed to it
const combine = (...moveGens) => function ()
{
	return moveGens.reduce((acc, cur) => acc.concat(cur.apply(this)), []);;
}

// Handles move generation for pieces with sliding moves
const slidingPieceGen = (...offsetIndices) => function ()
{
	const startTile = Board.fileRankToIndex(this.file, this.rank);
	const startMoveObj = getMoveObj(startTile);
	const moves = [];

	for (const dirIndex of offsetIndices)
	{
		const dirOffset = dirOffsets[dirIndex];
		const distFromEdge = distFromEdges[startTile][dirIndex];

		let numOfLoops = distFromEdge;
		if (['King', 'Blocker', 'Peasant'].includes(this.type)) numOfLoops = Math.min(1, distFromEdge);
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
			const moveObj = startMoveObj(targetTile);
			const pieceOnTargetTile = board.tiles[targetTile];

			if (distFromEdge !== 0)
			{
				// TODO: add en passant
				if (pieceOnTargetTile
					&& pieceOnTargetTile.type !== 'Blocker'
					&& pieceOnTargetTile.clr !== this.clr)
				{
					moves.push(moveObj);
				}
			}
		}
	}

	// vertical movement
	const vertIndex = this.clr ? 3 : 0;
	const vertOffset = dirOffsets[vertIndex];
	let numOfLoops = 2;
	if (this.type === 'Lancer') numOfLoops = Infinity;
	else if (!this.hasMoved) numOfLoops = 4;
	numOfLoops = Math.min(numOfLoops, distFromEdges[startTile][vertIndex]);
	for (let n = 0; n < numOfLoops; n++)
	{
		const targetTile = startTile + vertOffset * (n + 1);
		const moveObj = startMoveObj(targetTile, n ? 'multiPush' : null);
		const pieceOnTargetTile = board.tiles[targetTile];

		if (!pieceOnTargetTile) moves.push(moveObj);
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
