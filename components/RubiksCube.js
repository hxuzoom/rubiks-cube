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
        this.dragThreshold = 5;
        
        this.timerStarted = false;
        this.startTime = null;
        this.timerInterval = null;
        
        this.solveButton = document.getElementById('cheat-button');
        this.completionModal = document.getElementById('completion-modal');
        
        this.dragStart = new THREE.Vector2();
        this.dragCurrent = new THREE.Vector2();
        this.selectedCubelet = null;
        this.selectedFaceNormal = null;
        
        this.createCube();
        this.setupControls();
        this.setupModal();
    }

    setupControls() {
        document.addEventListener('touchstart', (e) => this.onTouchStart(e));
        document.addEventListener('touchmove', (e) => this.onTouchMove(e));
        document.addEventListener('touchend', () => this.onTouchEnd());
    }

    startTimer() {
        if (!this.timerStarted && this.moveHistory.length === 0) {
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

    onTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.onMouseDown(mouseEvent);
    }

    onTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.onMouseMove(mouseEvent);
    }

    onTouchEnd() {
        this.onMouseUp();
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
                    
                    // Add edges and bevel
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
                    
                    this.cubelets.push(cubelet);
                    this.group.add(cubelet);
                }
            }
        }

        this.group.rotation.x = 0;
        this.group.rotation.y = 0;
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
        this.moveHistory = [];
        
        const fastRotationSpeed = this.rotationSpeed;
        this.rotationSpeed = this.rotationSpeed / 3;
        
        moves.forEach(move => {
            this.animateMove(move);
        });

        setTimeout(() => {
            this.rotationSpeed = fastRotationSpeed;
            this.timerStarted = false;
            this.startTime = null;
            document.getElementById('timer').textContent = '00:00.000';
            document.getElementById('timer').style.display = 'none';
            document.getElementById('phase-label').style.display = 'block';
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
        if (!this.timerStarted) {
            return false;
        }

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
            if (cubelets.length !== 9) return false;
            
            const firstColor = cubelets[0].material[this.getFaceIndex(face)].color.getHex();
            
            for (const cubelet of cubelets) {
                const faceIndex = this.getFaceIndex(face);
                if (!cubelet.material[faceIndex] || 
                    cubelet.material[faceIndex].color.getHex() !== firstColor) {
                    return false;
                }
            }
        }

        return this.moveHistory.length > 0;
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

    handleRightClickDragStart(intersection, event) {
        if (!intersection || !intersection.point) return;
        
        // Get the clicked point in world coordinates
        const point = intersection.point;
        const cubelet = intersection.object;
        
        // Calculate which face was clicked by finding the largest component
        const localPoint = point.clone().sub(cubelet.position);
        const absX = Math.abs(localPoint.x);
        const absY = Math.abs(localPoint.y);
        const absZ = Math.abs(localPoint.z);
        
        let normal = new THREE.Vector3();
        if (absX > absY && absX > absZ) {
            normal.x = Math.sign(localPoint.x);
        } else if (absY > absX && absY > absZ) {
            normal.y = Math.sign(localPoint.y);
        } else {
            normal.z = Math.sign(localPoint.z);
        }
        
        // Store exact click position for more accurate row/column detection
        this.clickPosition = intersection.point.clone();
        this.selectedCubelet = cubelet;
        this.selectedFaceNormal = normal;
        this.dragStart.set(event.clientX, event.clientY);
        this.dragCurrent.copy(this.dragStart);
        
        // Start the timer when first interacting with the cube
        this.startTimer();
        
        console.log('Started drag:', {
            clickPosition: this.clickPosition,
            cubelet: this.selectedCubelet.position,
            normal: this.selectedFaceNormal,
            face: this.getNearestFace(this.selectedFaceNormal)
        });
    }

    handleRightClickDrag(event) {
        if (!this.selectedCubelet || this.isAnimating) return;
        
        this.dragCurrent.set(event.clientX, event.clientY);
        const dragDelta = this.dragCurrent.clone().sub(this.dragStart);
        
        console.log('Dragging:', dragDelta.length(), 'threshold:', this.dragThreshold);
        
        if (dragDelta.length() > this.dragThreshold) {
            const move = this.determineMoveFromDrag(dragDelta);
            console.log('Determined Move:', move);
            
            if (move) {
                // Convert middle slice moves to regular face moves
                let actualMove = move;
                switch(move) {
                    case 'M':
                        actualMove = 'L';
                        break;
                    case 'M\'':
                        actualMove = 'L\'';
                        break;
                    case 'E':
                        actualMove = 'D';
                        break;
                    case 'E\'':
                        actualMove = 'D\'';
                        break;
                    case 'S':
                        actualMove = 'F';
                        break;
                    case 'S\'':
                        actualMove = 'F\'';
                        break;
                }
                
                this.animateMove(actualMove);
                this.selectedCubelet = null;
                this.selectedFaceNormal = null;
                this.dragStart.copy(this.dragCurrent);
            }
        }
    }

    handleRightClickDragEnd() {
        this.selectedCubelet = null;
        this.selectedFaceNormal = null;
    }

    determineMoveFromDrag(dragDelta) {
        if (!this.selectedFaceNormal || !this.selectedCubelet || !this.clickPosition) return null;
        
        const face = this.getNearestFace(this.selectedFaceNormal);
        if (!face) return null;
        
        // Get camera orientation vectors
        const camera = window.camera;
        const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Convert screen drag to world space direction
        const dragVector = new THREE.Vector3()
            .addScaledVector(cameraRight, dragDelta.x)
            .addScaledVector(cameraUp, -dragDelta.y)
            .normalize();
        
        const isVertical = Math.abs(dragVector.dot(cameraUp)) > Math.abs(dragVector.dot(cameraRight));
        
        // Get clicked position relative to face center
        const localClick = this.clickPosition.clone().sub(this.selectedCubelet.position);
        
        // Project click position onto face plane based on face normal
        const faceNormal = this.selectedFaceNormal;
        const projectedClick = localClick.clone().projectOnPlane(faceNormal);
        
        // Transform projected position to face local space
        let row, column;
        const threshold = 0.3;
        
        switch(face) {
            case 'F':
                column = projectedClick.x > threshold ? 2 : projectedClick.x < -threshold ? 0 : 1;
                row = projectedClick.y > threshold ? 2 : projectedClick.y < -threshold ? 0 : 1;
                break;
            case 'B':
                column = projectedClick.x < -threshold ? 2 : projectedClick.x > threshold ? 0 : 1;
                row = projectedClick.y > threshold ? 2 : projectedClick.y < -threshold ? 0 : 1;
                break;
            case 'U':
                column = projectedClick.x > threshold ? 2 : projectedClick.x < -threshold ? 0 : 1;
                row = projectedClick.z > threshold ? 2 : projectedClick.z < -threshold ? 0 : 1;
                break;
            case 'D':
                column = projectedClick.x > threshold ? 2 : projectedClick.x < -threshold ? 0 : 1;
                row = projectedClick.z < -threshold ? 2 : projectedClick.z > threshold ? 0 : 1;
                break;
            case 'R':
                column = projectedClick.z < -threshold ? 2 : projectedClick.z > threshold ? 0 : 1;
                row = projectedClick.y > threshold ? 2 : projectedClick.y < -threshold ? 0 : 1;
                break;
            case 'L':
                column = projectedClick.z > threshold ? 2 : projectedClick.z < -threshold ? 0 : 1;
                row = projectedClick.y > threshold ? 2 : projectedClick.y < -threshold ? 0 : 1;
                break;
        }
        
        // Determine primary drag direction in face space
        const dragInFaceSpace = new THREE.Vector3();
        switch(face) {
            case 'F':
            case 'B':
                dragInFaceSpace.x = dragVector.dot(cameraRight);
                dragInFaceSpace.y = dragVector.dot(cameraUp);
                break;
            case 'U':
            case 'D':
                dragInFaceSpace.x = dragVector.dot(cameraRight);
                dragInFaceSpace.z = -dragVector.dot(cameraForward);
                break;
            case 'R':
            case 'L':
                dragInFaceSpace.z = -dragVector.dot(cameraForward);
                dragInFaceSpace.y = dragVector.dot(cameraUp);
                break;
        }
        
        let move = '';
        if (isVertical) {
            // Vertical drag - move columns
            switch(face) {
                case 'F':
                case 'B':
                    move = column === 0 ? 'L' : column === 2 ? 'R' : 'M';
                    move += (face === 'B' ? dragInFaceSpace.y : -dragInFaceSpace.y) > 0 ? '' : '\'';
                    break;
                case 'U':
                case 'D':
                    move = row === 0 ? 'B' : row === 2 ? 'F' : 'S';
                    move += dragInFaceSpace.y > 0 ? '' : '\'';
                    break;
                case 'L':
                case 'R':
                    move = row === 0 ? 'B' : row === 2 ? 'F' : 'S';
                    move += (face === 'R' ? -dragInFaceSpace.y : dragInFaceSpace.y) > 0 ? '' : '\'';
                    break;
            }
        } else {
            // Horizontal drag - move rows
            switch(face) {
                case 'F':
                case 'B':
                    move = row === 0 ? 'D' : row === 2 ? 'U' : 'E';
                    move += (face === 'B' ? -dragInFaceSpace.x : dragInFaceSpace.x) > 0 ? '' : '\'';
                    break;
                case 'U':
                case 'D':
                    move = column === 0 ? 'L' : column === 2 ? 'R' : 'M';
                    move += (face === 'D' ? -dragInFaceSpace.x : dragInFaceSpace.x) > 0 ? '' : '\'';
                    break;
                case 'L':
                case 'R':
                    move = row === 0 ? 'D' : row === 2 ? 'U' : 'E';
                    move += (face === 'R' ? -dragInFaceSpace.x : dragInFaceSpace.x) > 0 ? '' : '\'';
                    break;
            }
        }
        
        console.log('Move calculation:', {
            face,
            isVertical,
            dragVector,
            dragInFaceSpace,
            row,
            column,
            move
        });
        
        return move;
    }
} 