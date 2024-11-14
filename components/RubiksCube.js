import * as THREE from 'three';
import { RubiksCubeScrambler } from '../js/scramble.js';
import * as TWEEN from '@tweenjs/tween.js';

export class RubiksCube {
    constructor() {
        this.group = new THREE.Group();
        this.cubelets = [];
        this.scrambler = new RubiksCubeScrambler();
        this.isAnimating = false;
        this.animationQueue = [];
        this.rotationSpeed = 0.3;
        this.moveHistory = [];
        this.isSolving = false;
        
        this.isDragging = false;
        this.dragStartPoint = new THREE.Vector2();
        this.dragEndPoint = new THREE.Vector2();
        this.selectedFace = null;
        this.raycaster = new THREE.Raycaster();
        
        this.timerStarted = false;
        this.startTime = null;
        this.timerInterval = null;
        
        this.solveButton = document.getElementById('cheat-button');
        this.completionModal = document.getElementById('completion-modal');
        
        this.createCube();
        this.setupControls();
        this.setupModal();
    }

    setupControls() {
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.onMouseUp());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    startTimer() {
        if (!this.timerStarted) {
            this.timerStarted = true;
            this.startTime = Date.now();
            document.getElementById('phase-label').style.display = 'none';
            document.getElementById('timer').style.display = 'block';
            
            this.solveButton.style.display = 'none';
            
            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                const milliseconds = elapsed % 1000;
                
                document.getElementById('timer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            }, 10);
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    onMouseDown(event) {
        if (this.isAnimating) return;
        
        this.isDragging = true;
        this.dragStartPoint.set(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        this.raycaster.setFromCamera(this.dragStartPoint, window.camera);
        const intersects = this.raycaster.intersectObjects(this.cubelets);
        
        if (intersects.length > 0 && intersects[0].face) {
            const intersection = intersects[0];
            const normal = intersection.face.normal.clone();
            normal.transformDirection(intersection.object.matrixWorld);
            this.selectedFace = this.getNearestFace(normal);
        }
    }

    onMouseMove(event) {
        if (!this.isDragging || !this.selectedFace || this.isAnimating) return;
        
        this.dragEndPoint.set(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        const dragDelta = this.dragEndPoint.clone().sub(this.dragStartPoint);
        
        if (dragDelta.length() > 0.1) {
            const move = this.determineMove(this.selectedFace, dragDelta);
            if (move) {
                this.animateMove(move);
                this.isDragging = false;
                this.selectedFace = null;
            }
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.selectedFace = null;
    }

    determineMove(face, dragDelta) {
        const camera = window.camera;
        const cameraRight = new THREE.Vector3(1, 0, 0);
        const cameraUp = new THREE.Vector3(0, 1, 0);
        cameraRight.applyQuaternion(camera.quaternion);
        cameraUp.applyQuaternion(camera.quaternion);
        
        const worldDelta = new THREE.Vector3()
            .addScaledVector(cameraRight, dragDelta.x)
            .addScaledVector(cameraUp, dragDelta.y);
        
        const moves = {
            'F': { x: 'R', y: 'U' },
            'B': { x: 'L', y: 'U' },
            'U': { x: 'R', y: 'F' },
            'D': { x: 'R', y: 'B' },
            'L': { x: 'B', y: 'U' },
            'R': { x: 'F', y: 'U' }
        };
        
        const dominantAxis = Math.abs(worldDelta.x) > Math.abs(worldDelta.y) ? 'x' : 'y';
        const direction = dominantAxis === 'x' ? 
            (worldDelta.x > 0 ? '' : '\'') :
            (worldDelta.y > 0 ? '' : '\'');
        
        return moves[face][dominantAxis] + direction;
    }

    onKeyDown(event) {
        if (this.isAnimating) return;
        
        const keyMoves = {
            'KeyF': 'F',
            'KeyB': 'B',
            'KeyR': 'R',
            'KeyL': 'L',
            'KeyU': 'U',
            'KeyD': 'D',
            'KeyI': 'U',
            'KeyK': 'D',
            'KeyJ': 'L',
            'KeyL': 'R',
            'Space': 'F',
            'KeyH': 'B',
            'ShiftLeft': '\'',
            'ShiftRight': '\'',
            'AltLeft': '2',
            'AltRight': '2'
        };
        
        if (keyMoves[event.code]) {
            this.startTimer();
            
            const move = keyMoves[event.code];
            if (move === '\'' || move === '2') return;
            
            let modifier = '';
            if (event.shiftKey) modifier = '\'';
            else if (event.altKey) modifier = '2';
            
            this.animateMove(move + modifier);
        }
    }

    createCube() {
        const colors = {
            front: 0xb71234,
            back: 0xff5800,
            top: 0xffffff,
            bottom: 0xffd500,
            right: 0x009b48,
            left: 0x0046ad
        };

        const size = 1;
        const gap = 0.02;
        const geometry = new THREE.BoxGeometry(size, size, size, 1, 1, 1);
        const bevelSize = 0.1;
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const materials = [];
                    for (let i = 0; i < 6; i++) {
                        let color;
                        switch(i) {
                            case 0: color = x === 1 ? colors.right : 0x111111; break;
                            case 1: color = x === -1 ? colors.left : 0x111111; break;
                            case 2: color = y === 1 ? colors.top : 0x111111; break;
                            case 3: color = y === -1 ? colors.bottom : 0x111111; break;
                            case 4: color = z === 1 ? colors.front : 0x111111; break;
                            case 5: color = z === -1 ? colors.back : 0x111111; break;
                        }
                        
                        materials.push(new THREE.MeshPhongMaterial({
                            color: color,
                            shininess: 30,
                            specular: 0x222222,
                            flatShading: false,
                            polygonOffset: true,
                            polygonOffsetFactor: 1,
                            polygonOffsetUnits: 1
                        }));
                    }

                    const cubelet = new THREE.Mesh(geometry, materials);
                    
                    const edges = new THREE.EdgesGeometry(geometry);
                    const edgeMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x000000, 
                        linewidth: 2,
                        transparent: true,
                        opacity: 0.85
                    });
                    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
                    
                    const bevelGeometry = new THREE.BoxGeometry(
                        size - bevelSize,
                        size - bevelSize,
                        size - bevelSize
                    );
                    const bevelMaterial = new THREE.MeshPhongMaterial({
                        color: 0x000000,
                        transparent: true,
                        opacity: 0.3
                    });
                    const bevel = new THREE.Mesh(bevelGeometry, bevelMaterial);
                    cubelet.add(bevel);

                    cubelet.add(edgeLines);
                    cubelet.position.set(
                        x * (size + gap),
                        y * (size + gap),
                        z * (size + gap)
                    );
                    
                    cubelet.rotation.x = Math.random() * 0.01;
                    cubelet.rotation.y = Math.random() * 0.01;
                    cubelet.rotation.z = Math.random() * 0.01;
                    
                    this.cubelets.push(cubelet);
                    this.group.add(cubelet);
                }
            }
        }

        this.group.rotation.x = 0.2;
        this.group.rotation.y = -0.4;
    }

    setupModal() {
        const startButton = document.getElementById('start-button');
        const modalOverlay = document.getElementById('modal-overlay');
        
        startButton.addEventListener('click', () => {
            this.resetGame();
            
            modalOverlay.style.animation = 'fadeIn 0.5s ease-out reverse';
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                this.scramble();
            }, 500);
        });
    }

    resetGame() {
        this.timerStarted = false;
        this.startTime = null;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        document.getElementById('timer').textContent = '00:00.000';
        document.getElementById('timer').style.display = 'none';
        document.getElementById('phase-label').style.display = 'block';
        this.solveButton.style.display = 'block';
        
        this.moveHistory = [];
        this.isAnimating = false;
        this.animationQueue = [];
        this.isSolving = false;
    }

    scramble() {
        const moves = this.scrambler.generateScramble(25);
        this.moveHistory = [...moves];
        
        const fastRotationSpeed = this.rotationSpeed;
        this.rotationSpeed = this.rotationSpeed / 3;
        
        moves.forEach(move => {
            this.animateMove(move);
        });

        setTimeout(() => {
            this.rotationSpeed = fastRotationSpeed;
        }, moves.length * (this.rotationSpeed * 1000));
    }

    animateMove(move) {
        if (this.isAnimating) {
            this.animationQueue.push(move);
            return;
        }

        if (!this.isSolving && !this.moveHistory.includes(move)) {
            this.moveHistory.push(move);
        }

        this.isAnimating = true;
        const { axis, angle, face } = this.scrambler.getMoveRotation(move);
        const cubelets = this.getCubeletsInFace(face);
        const startRotation = { rotation: 0 };
        
        new TWEEN.Tween(startRotation)
            .to({ rotation: angle }, this.rotationSpeed * 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                const deltaRotation = startRotation.rotation - (startRotation._previousRotation || 0);
                this.rotateCubelets(cubelets, axis, deltaRotation);
                startRotation._previousRotation = startRotation.rotation;
            })
            .onComplete(() => {
                this.isAnimating = false;
                
                if (!this.isSolving && this.isCubeSolved()) {
                    this.stopTimer();
                    this.showCompletionModal();
                }
                
                if (this.animationQueue.length > 0) {
                    const nextMove = this.animationQueue.shift();
                    this.animateMove(nextMove);
                }
            })
            .start();
    }

    rotateCubelets(cubelets, axis, angle) {
        const rotationMatrix = new THREE.Matrix4();
        switch(axis) {
            case 'x': rotationMatrix.makeRotationX(angle); break;
            case 'y': rotationMatrix.makeRotationY(angle); break;
            case 'z': rotationMatrix.makeRotationZ(angle); break;
        }

        cubelets.forEach(cubelet => {
            cubelet.position.applyMatrix4(rotationMatrix);
            cubelet.rotateOnWorldAxis(
                new THREE.Vector3(
                    axis === 'x' ? 1 : 0,
                    axis === 'y' ? 1 : 0,
                    axis === 'z' ? 1 : 0
                ),
                angle
            );
        });
    }

    getCubeletsInFace(face) {
        return this.cubelets.filter(cubelet => {
            const pos = cubelet.position;
            switch(face) {
                case 'F': return Math.abs(pos.z - 1) < 0.1;
                case 'B': return Math.abs(pos.z + 1) < 0.1;
                case 'U': return Math.abs(pos.y - 1) < 0.1;
                case 'D': return Math.abs(pos.y + 1) < 0.1;
                case 'L': return Math.abs(pos.x + 1) < 0.1;
                case 'R': return Math.abs(pos.x - 1) < 0.1;
                default: return false;
            }
        });
    }

    getNearestFace(normal) {
        const faces = {
            'F': new THREE.Vector3(0, 0, 1),
            'B': new THREE.Vector3(0, 0, -1),
            'U': new THREE.Vector3(0, 1, 0),
            'D': new THREE.Vector3(0, -1, 0),
            'R': new THREE.Vector3(1, 0, 0),
            'L': new THREE.Vector3(-1, 0, 0)
        };

        let maxDot = -1;
        let nearestFace = null;

        for (const [face, faceNormal] of Object.entries(faces)) {
            const dot = normal.dot(faceNormal);
            if (dot > maxDot) {
                maxDot = dot;
                nearestFace = face;
            }
        }

        return nearestFace;
    }

    async solve() {
        this.stopTimer();
    }

    isCubeSolved() {
        const faces = {
            'F': new THREE.Vector3(0, 0, 1),
            'B': new THREE.Vector3(0, 0, -1),
            'U': new THREE.Vector3(0, 1, 0),
            'D': new THREE.Vector3(0, -1, 0),
            'R': new THREE.Vector3(1, 0, 0),
            'L': new THREE.Vector3(-1, 0, 0)
        };

        for (const [face, normal] of Object.entries(faces)) {
            const cubelets = this.getCubeletsInFace(face);
            const firstColor = cubelets[0].material[this.getFaceIndex(face)].color.getHex();
            
            for (const cubelet of cubelets) {
                if (cubelet.material[this.getFaceIndex(face)].color.getHex() !== firstColor) {
                    return false;
                }
            }
        }
        return true;
    }

    getFaceIndex(face) {
        switch(face) {
            case 'R': return 0;
            case 'L': return 1;
            case 'U': return 2;
            case 'D': return 3;
            case 'F': return 4;
            case 'B': return 5;
            default: return -1;
        }
    }

    showCompletionModal() {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = elapsed % 1000;
        
        const timeString = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        
        document.getElementById('completion-time').textContent = timeString;
        this.completionModal.style.display = 'flex';
        
        document.getElementById('restart-button').onclick = () => {
            this.completionModal.style.display = 'none';
            this.resetGame();
            this.scramble();
        };
    }
} 