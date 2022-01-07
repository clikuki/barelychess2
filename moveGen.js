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

const slidingMoveGen = (...offsetIndices) =>
{
	return function ()
	{
		const startTile = Board.fileRankToIndex(this.file, this.rank);
		const startMoveObj = getMoveObj(startTile);
		const semiLegalMoves = [];

		for (const dirIndex of offsetIndices)
		{
			const dirOffset = dirOffsets[dirIndex];
			const distFromEdge = distFromEdges[startTile][dirIndex];
			const numOfLoops = ['King', 'Blocker'].includes(this.type) ? Math.min(1, distFromEdge) : distFromEdge;

			for (let n = 0; n < numOfLoops; n++)
			{
				const targetTile = startTile + dirOffset * (n + 1);
				const moveObj = startMoveObj(targetTile);
				const pieceOnTargetTile = board.tiles[targetTile];

				if (!pieceOnTargetTile) semiLegalMoves.push(moveObj);
				else
				{
					if (pieceOnTargetTile.clr !== this.clr)
					{
						if (this.type !== 'Blocker' && this.type !== 'Priest'
							|| pieceOnTargetTile.type === 'Pawn')
						{
							semiLegalMoves.push(moveObj);
						}
					}

					break;
				}
			}
		}

		return semiLegalMoves;
	}
}
