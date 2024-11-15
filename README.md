# Three.js Rubik's Cube

An interactive 3D Rubik's Cube implementation using Three.js.

## Features

- Realistic 3D rendering with proper lighting and shadows
- Intuitive drag controls for cube manipulation
- Visual feedback with section highlighting
- Timer to track solving speed
- Scramble function
- Auto-solve feature

## Controls

### Basic Controls
- **Right Click + Drag**: Rotate face sections
- **Left Click + Drag**: Orbit/rotate the camera view
- **Hover**: Highlights the section you're pointing at

### How to Move Sections
1. Hover over any section you want to rotate (it will highlight in green)
2. Right-click and hold on that section
3. Drag in the direction you want to rotate:
   - Drag up/down to rotate columns
   - Drag left/right to rotate rows

### Additional Features
- **Scramble**: Automatically scrambles the cube when starting a new game
- **Solve Button**: Automatically solves the cube (for when you're stuck!)
- **Timer**: Tracks your solving time
- **Fixed Camera Distance**: Maintains optimal viewing distance

## Technical Details

Built using:
- Three.js for 3D rendering
- Tween.js for smooth animations
- Custom face detection and rotation logic
- Responsive design that works on various screen sizes

## Getting Started

1. Click the "Start Solving" button to begin
2. The cube will be scrambled automatically
3. Use the controls to try solving the cube
4. The timer will track your progress
5. Complete the cube to see your solving time!

## Tips

- Watch the green highlight to see which section you're about to move
- Use the camera orbit (left-click drag) to get better angles
- Practice the basic movements to build muscle memory

## License
MIT License - feel free to use and modify! 

PS: I updated the controls to be more intuitive, as a lot of people were confused by the original controls.