export class RubiksCubeSolver {
    constructor(rubiksCube) {
        this.cube = rubiksCube;
        this.moveQueue = [];
    }

    reverseMove(move) {
        const face = move.charAt(0);
        const modifier = move.substring(1);
        
        if (modifier === '2') return move;
        
        return face + (modifier === '\'' ? '' : '\'');
    }

    async solve() {
        if (!this.cube.moveHistory || this.cube.moveHistory.length === 0) {
            console.warn('No move history available to solve the cube');
            return;
        }

        this.cube.isSolving = true;
        this.cube.stopTimer();
        
        const sequence = [...this.cube.moveHistory].reverse();
        
        const reversedSequence = sequence.map(move => this.reverseMove(move));

        for (const move of reversedSequence) {
            await this.executeMove(move);
        }

        this.cube.moveHistory = [];
        this.cube.isSolving = false;
    }

    executeMove(move) {
        return new Promise(resolve => {
            this.cube.animateMove(move);
            setTimeout(resolve, this.cube.rotationSpeed * 1000 + 50);
        });
    }
} 