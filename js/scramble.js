export class RubiksCubeScrambler {
    constructor() {
        this.moves = ['F', 'B', 'U', 'D', 'L', 'R'];
        this.modifiers = ['', '\'', '2'];
    }

    generateScramble(moveCount = 25) {
        const sequence = [];
        let lastMove = '';
        let secondLastMove = '';

        for (let i = 0; i < moveCount; i++) {
            let move;
            do {
                move = this.moves[Math.floor(Math.random() * this.moves.length)];
            } while (
                move === lastMove || 
                (this.isOppositeFace(move, lastMove)) ||
                (move === secondLastMove && lastMove === this.getOppositeFace(move))
            );

            const rand = Math.random();
            let modifier;
            if (rand < 0.4) modifier = '';
            else if (rand < 0.8) modifier = '\'';
            else modifier = '2';

            sequence.push(move + modifier);

            secondLastMove = lastMove;
            lastMove = move;
        }

        return this.shuffleArray(sequence);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    isOppositeFace(move1, move2) {
        const opposites = {
            'F': 'B',
            'B': 'F',
            'U': 'D',
            'D': 'U',
            'L': 'R',
            'R': 'L'
        };
        return opposites[move1] === move2;
    }

    getOppositeFace(move) {
        const opposites = {
            'F': 'B',
            'B': 'F',
            'U': 'D',
            'D': 'U',
            'L': 'R',
            'R': 'L'
        };
        return opposites[move];
    }

    getMoveRotation(move) {
        const face = move.charAt(0);
        const modifier = move.substring(1);
        
        let angle = Math.PI / 2;
        if (modifier === '\'') angle = -Math.PI / 2;
        if (modifier === '2') angle = Math.PI;

        const axis = this.getMoveAxis(face);
        return { axis, angle, face };
    }

    getMoveAxis(face) {
        switch(face) {
            case 'F': case 'B': return 'z';
            case 'U': case 'D': return 'y';
            case 'L': case 'R': return 'x';
            default: return null;
        }
    }
} 