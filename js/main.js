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

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x222222);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(3.5, 3.5, 3.5);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

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

        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 15;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
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