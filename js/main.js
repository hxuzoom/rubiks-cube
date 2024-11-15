import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RubiksCube } from '../components/RubiksCube.js';
import { RubiksCubeSolver } from './solver.js';
import * as TWEEN from '@tweenjs/tween.js';

class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.solver = null;
        this.isSolving = false;

        this.isRightClickHeld = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.highlightedCubelets = [];
        this.hoverMaterial = new THREE.LineBasicMaterial({
            color: 0x4CAF50,      // Keep the green color
            linewidth: 5,         // Increased line width
            transparent: true,
            opacity: 1.0,         // Full opacity
        });
        
        this.glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.3,         // Increased opacity
            side: THREE.DoubleSide
        });
        
        this.outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.5,
            side: THREE.BackSide
        });
        
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x222222);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right click
                this.isRightClickHeld = true;
                document.body.style.cursor = 'grabbing';
                
                // Disable OrbitControls
                this.controls.enabled = false;
                
                // Get intersection point
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, this.camera);
                
                const intersects = this.raycaster.intersectObjects(this.rubiksCube.cubelets);
                console.log('Intersects:', intersects);
                
                if (intersects.length > 0) {
                    const intersection = intersects[0];
                    console.log('Selected intersection:', intersection);
                    this.rubiksCube.handleRightClickDragStart(intersection, e);
                }
            }
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (this.isRightClickHeld) {
                this.rubiksCube.handleRightClickDrag(e);
            } else {
                this.updateHoverHighlight(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // Right click
                this.isRightClickHeld = false;
                document.body.style.cursor = 'default';
                this.rubiksCube.handleRightClickDragEnd();
                // Re-enable OrbitControls
                this.controls.enabled = true;
            }
        });
        
        document.addEventListener('mouseleave', () => {
            if (this.isRightClickHeld) {
                this.isRightClickHeld = false;
                document.body.style.cursor = 'default';
            }
        });

        this.renderer.domElement.addEventListener('mouseout', () => {
            this.clearHighlight();
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(ambientLight, directionalLight);

        this.rubiksCube = new RubiksCube();
        this.scene.add(this.rubiksCube.group);
        
        this.solver = new RubiksCubeSolver(this.rubiksCube);

        const cheatButton = document.getElementById('cheat-button');
        cheatButton.addEventListener('click', () => this.handleSolve());

        window.camera = this.camera;

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    updateHoverHighlight(event) {
        this.clearHighlight();

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.rubiksCube.cubelets);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const cubelet = intersection.object;
            const point = intersection.point;
            
            const cameraPosition = this.camera.position.clone();
            const cameraDirection = cameraPosition.sub(point).normalize();
            
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
            
            const dotProduct = normal.dot(cameraDirection);
            if (dotProduct > 0) {
                const face = this.rubiksCube.getNearestFace(normal);
                const cubeletsInFace = this.rubiksCube.getCubeletsInFace(face);
                
                cubeletsInFace.forEach(cubelet => {
                    // Add thick outline
                    const edges = new THREE.EdgesGeometry(cubelet.geometry);
                    const line = new THREE.LineSegments(edges, this.hoverMaterial);
                    line.renderOrder = 3;
                    
                    // Add glow effect
                    const glowGeometry = new THREE.BoxGeometry(1.05, 1.05, 1.05);
                    const glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
                    glow.renderOrder = 1;
                    
                    // Add outline effect
                    const outlineGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
                    const outline = new THREE.Mesh(outlineGeometry, this.outlineMaterial);
                    outline.renderOrder = 2;
                    
                    cubelet.add(line);
                    cubelet.add(glow);
                    cubelet.add(outline);
                    
                    this.highlightedCubelets.push({ 
                        cubelet, 
                        line,
                        glow,
                        outline
                    });
                });
            }
        }
    }

    clearHighlight() {
        this.highlightedCubelets.forEach(({ cubelet, line, glow, outline }) => {
            cubelet.remove(line);
            cubelet.remove(glow);
            cubelet.remove(outline);
            line.geometry.dispose();
            glow.geometry.dispose();
            outline.geometry.dispose();
        });
        this.highlightedCubelets = [];
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        TWEEN.update();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async handleSolve() {
        if (this.isSolving) return;
        
        const button = document.getElementById('cheat-button');
        button.disabled = true;
        this.isSolving = true;
        
        try {
            await this.solver.solve();
        } catch (error) {
            console.error('Error solving cube:', error);
        }
        
        button.disabled = false;
        this.isSolving = false;
    }
}

new Scene(); 