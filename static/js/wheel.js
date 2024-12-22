class Wheel {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.names = [];
        this.rotation = 0;
        this.isSpinning = false;
        this.loadNames();
    }

    async loadNames() {
        const response = await fetch('/api/names',
            { method: 'GET' }
        );
        this.names = await response.json();
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 10;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (this.names.length === 0) {
            // Draw placeholder text if no names
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.fillText('Add names to start', centerX, centerY);
            ctx.restore();
            return;
        }

        // Draw wheel segments
        const segmentAngle = (2 * Math.PI) / this.names.length;
        this.names.forEach((name, i) => {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, 
                i * segmentAngle + this.rotation,
                (i + 1) * segmentAngle + this.rotation);
            ctx.closePath();

            // Alternate colors with a gradient effect
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, radius
            );
            if (i % 4 === 0) {
                gradient.addColorStop(0, '#5cb85c');
                gradient.addColorStop(1, '#4CAF50');
            } else if (i % 4 === 1) {
                gradient.addColorStop(0, '#428bca');
                gradient.addColorStop(1, '#2196F3');
            }else if (i % 4 === 2) {
                gradient.addColorStop(0, '#f0ad4e');
                gradient.addColorStop(1, '#FF9800');
            }else{
                gradient.addColorStop(0, '#d9534f');
                gradient.addColorStop(1, '#F44336');
            }
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();

            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(i * segmentAngle + segmentAngle / 2 + this.rotation);
            
            // Calculate font size based on number of names
            const maxFontSize = 20;
            const minFontSize = 8;
            let fontSize = Math.max(minFontSize, 
                Math.min(maxFontSize, Math.floor(300 / this.names.length))
            );
            
            // Truncate text if too long
            let displayName = name;
            ctx.font = `bold ${fontSize}px Arial`;
            const maxWidth = radius * 0.7; // 70% of radius
            
            if (ctx.measureText(displayName).width > maxWidth) {
                // Try to fit text by truncating
                while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 0) {
                    displayName = displayName.slice(0, -1);
                }
                displayName += '...';
            }

            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;
            ctx.fillText(displayName, radius - 20, fontSize / 3);
            ctx.restore();
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        const centerGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, 20
        );
        centerGradient.addColorStop(0, '#444');
        centerGradient.addColorStop(1, '#333');
        ctx.fillStyle = centerGradient;
        ctx.fill();

        // Draw pointer
        ctx.beginPath();
        ctx.moveTo(centerX + 30, centerY);
        ctx.lineTo(centerX - 10, centerY - 10);
        ctx.lineTo(centerX - 10, centerY + 10);
        ctx.closePath();
        ctx.fillStyle = '#dc3545';
        ctx.fill();
    }

    async spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        
        const spinButton = document.getElementById('spin-button');
        spinButton.disabled = true;

        // Initialize audio
        const spinSound = new Audio('/static/sound/spin-232536.mp3');
        spinSound.loop = true; // Loop the sound during the spin

        // Get result from server
        const response = await fetch('/api/spin', {
            method: 'POST'
        });
        const { result } = await response.json();

        if (!result) {
            alert('No names available to spin!');
            this.isSpinning = false;
            spinButton.disabled = false;
            return;
        }

        // Calculate target rotation
        const targetIndex = this.names.indexOf(result);
        const segmentAngle = (2 * Math.PI) / this.names.length;
        // Normalize current rotation to be within 0 to 2π
        this.rotation = this.rotation % (2 * Math.PI);
        if (this.rotation < 0) {
            this.rotation += 2 * Math.PI;
        }
        
        // Calculate the shortest path to the target
        let targetRotation = -(targetIndex * segmentAngle + segmentAngle / 2);
        // Normalize target rotation
        targetRotation = targetRotation % (2 * Math.PI);
        if (targetRotation < 0) {
            targetRotation += 2 * Math.PI;
        }
        
        // Add extra spins
        const spins = 5;
        const totalRotation = -(2 * Math.PI * spins) + targetRotation;

        // Animate the spin
        const startRotation = this.rotation;
        const startTime = performance.now();
        const duration = 4000; // 4 seconds

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth deceleration
            const easeOut = t => 1 - Math.pow(1 - t, 3);
            
            this.rotation = startRotation + (totalRotation - startRotation) * easeOut(progress);
            this.draw();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                spinSound.pause(); // Stop the sound
                spinSound.currentTime = 0; // Reset sound playback
                this.isSpinning = false;
                spinButton.disabled = false;
                showResult(result);
            }
        };
        spinSound.play(); // Start playing sound
        requestAnimationFrame(animate);
    }
    async remove(name){
        const response = await fetch('/api/names', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name})
        });
        this.loadNames();
    }
}

// Initialize wheel when page loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('wheel');
    const wheel = new Wheel(canvas);

    document.getElementById('spin-button').addEventListener('click', () => {
        wheel.spin();
    });

    // Make wheel accessible globally
    window.wheel = wheel;
});
