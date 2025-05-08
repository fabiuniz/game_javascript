class cls_game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        /* Definição dos estados do jogo*/
        this.VM_STANDBY = 0;
        this.VM_WALK = 1;
        this.VM_SHOOT = 2;
        this.VM_JUMP = 3;

        /* Inicializações*/
        this.facingDirection = 'right';
        this.action = this.VM_STANDBY;
        this.actionTime = 0;
        this.screenPosition = 0; // Removido o valor inicial 124 para fundo infinito
        this.keyState = {};
        this.isJumping = false;
        this.gravity = 0.5;
        this.jumpVelocity = -10;
        this.currentJumpVelocity = 0;
        this.groundLevel = this.canvas.height - 160;
        this.personY = this.groundLevel;
        this.personHeight = 160;
        this.lastFrameTime = performance.now();
        this.deltaTime = 0;
        this.frameIndex = 0;
        this.frameTime = 0;
        this.frameDuration = 100; // Duração de cada frame em ms

        // Sistema de projéteis
        this.projectiles = [];

        // Objeto para imagens
        this.images = {
            floor: new Image(),
            ceiling: new Image(),
            pillar: new Image(),
            forest: new Image(),
            personSpriteSheet: new Image()
        };

        // Configuração da spritesheet
        this.larguraDoFrame = 157;
        this.alturaDoFrame = 467 / 4;
        this.spriteFrames = {
            standby: [2],
            walk: [6, 7],
            shoot: [12, 11],
            jump: [16, 17]
        };

        // Inicializar o jogo
        this.init();
    }

    getPersonSprite(frameIndex) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.larguraDoFrame;
        canvas.height = this.alturaDoFrame;

        const numColunas = 4;
        const linha = Math.floor(frameIndex / numColunas);
        const coluna = frameIndex % numColunas;
        const spriteX = coluna * this.larguraDoFrame;
        const spriteY = linha * this.alturaDoFrame;

        ctx.drawImage(
            this.images.personSpriteSheet,
            spriteX,
            spriteY,
            this.larguraDoFrame,
            this.alturaDoFrame,
            0,
            0,
            this.larguraDoFrame,
            this.alturaDoFrame
        );

        return canvas;
    }

    displaySpriteSheetPreview() {
        const previewContainer = document.getElementById('spritePreview');
        previewContainer.innerHTML = '<h3>Visualização da Spritesheet</h3>';

        // Definir o número total de frames (baseado na spritesheet 4x1)
        const totalFrames = 19;
        const frameLabels = [];
        for (let i = 0; i < 20; i++) {
            frameLabels.push(String(i));
        }

        for (let i = 0; i < totalFrames; i++) {
            const frameDiv = document.createElement('div');
            frameDiv.className = 'sprite-frame';

            const spriteCanvas = this.getPersonSprite(i);
            spriteCanvas.style.width = '78px';
            spriteCanvas.style.height = '80px';

            const label = document.createElement('span');
            label.textContent = frameLabels[i];

            frameDiv.appendChild(spriteCanvas);
            frameDiv.appendChild(label);
            previewContainer.appendChild(frameDiv);
        }
    }

    drawBackground() {
        // Floresta (fundo com paralaxe)
        const forestWidth = this.images.forest.width; // Largura da imagem da floresta
        const parallaxSpeed = 0.5; // Velocidade de paralaxe
        let bgX1 = -(this.screenPosition * parallaxSpeed) % forestWidth;
        let bgX2 = bgX1 + forestWidth;
        this.ctx.drawImage(this.images.forest, bgX1, 0, forestWidth, this.canvas.height);
        this.ctx.drawImage(this.images.forest, bgX2, 0, forestWidth, this.canvas.height);

        // Teto e chão
        const tileSize = 32; // Tamanho do tile (32x32 pixels)
        const tilesPerScreen = Math.ceil(this.canvas.width / tileSize) + 1; // Tiles necessários para cobrir a tela + 1
        const tileOffset = (this.screenPosition % tileSize); // Offset para alinhar tiles
        const startTile = Math.floor(this.screenPosition / tileSize); // Índice do primeiro tile visível

        for (let i = 0; i < tilesPerScreen; i++) {
            let tileX = (i * tileSize) - tileOffset;
            this.ctx.drawImage(this.images.ceiling, tileX, -2, tileSize, tileSize);
            this.ctx.drawImage(this.images.floor, tileX, 232, tileSize, tileSize);
        }

        // Pilares
        const pillarSpacing = 125; // Espaçamento entre pilares
        const pillarsPerScreen = Math.ceil(this.canvas.width / pillarSpacing) + 1; // Pilares necessários
        const pillarOffset = (this.screenPosition % pillarSpacing); // Offset para alinhar pilares
        const startPillar = Math.floor(this.screenPosition / pillarSpacing); // Índice do primeiro pilar visível

        for (let i = 0; i < pillarsPerScreen; i++) {
            let pillarX = (i * pillarSpacing) - pillarOffset;
            this.ctx.drawImage(this.images.pillar, pillarX, 30, 21, 74);
            this.ctx.drawImage(this.images.pillar, pillarX, 95, 21, 74);
            this.ctx.drawImage(this.images.pillar, pillarX, 160, 21, 74);
        }
    }

    drawPerson() {
        const personX = this.canvas.width / 2 - 78;
        let frames;
        switch (this.action) {
            case this.VM_STANDBY:
                frames = this.spriteFrames.standby;
                break;
            case this.VM_WALK:
                frames = this.spriteFrames.walk;
                break;
            case this.VM_SHOOT:
                frames = this.spriteFrames.shoot;
                break;
            case this.VM_JUMP:
                frames = this.spriteFrames.jump;
                break;
        }
        const currentFrame = frames[Math.floor(this.frameIndex) % frames.length];
        const sprite = this.getPersonSprite(currentFrame);
        if (this.facingDirection === 'left') {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(sprite, -personX - 78, this.personY + 54, 78, 84);
            this.ctx.scale(-1, 1);
        } else {
            this.ctx.drawImage(sprite, personX, this.personY + 54, 78, 84);
        }
    }

    drawStatusLabel() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText("Ação: " + (this.action === this.VM_STANDBY ? "Parado" :
            this.action === this.VM_WALK ? "Andando" :
            this.action === this.VM_SHOOT ? "Atirando" :
            "Pulando"), 10, 64);
        this.ctx.fillText("Tempo da ação: " + Math.round(this.actionTime), 10, 80);
        this.ctx.fillText("Posição da tela: " + Math.round(this.screenPosition), 10, 96);
        this.ctx.fillText("s = atirar; j = pular; setas = movimentar", 10, 112);
    }

    drawAllSprites() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();

        // Desenhar projéteis ativos
        this.projectiles.forEach(projectile => {
            if (projectile.active) {
                projectile.draw();
            }
        });
        this.drawPerson();
        this.drawStatusLabel();
    }

    createProjectile() {
        const personX = this.canvas.width / 2;
        const personWidth = 78;
        const projectileY = this.personY + this.personHeight / 2;
        let projectileX = this.facingDirection === 'right' ? personX + personWidth / 2 : personX - personWidth / 2;
        this.projectiles.push(new Projectile(projectileX, projectileY, this.facingDirection));
    }

    updateProjectiles(dt) {
        // Atualizar posição dos projéteis
        this.projectiles.forEach(projectile => {
            if (projectile.active) {
                projectile.update(dt);
            }
        });
        // Remover projéteis inativos
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].active) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    applyGravity(dt) {
        if (this.isJumping) {
            this.personY += this.currentJumpVelocity * (dt / 16);
            this.currentJumpVelocity += this.gravity * (dt / 16);
            // Verificar se o personagem chegou ao chão
            if (this.personY >= this.groundLevel) {
                this.personY = this.groundLevel;
                this.isJumping = false;
                this.currentJumpVelocity = 0;
                // Se estava pulando, voltar para o estado parado
                if (this.action === this.VM_JUMP) {
                    this.action = this.VM_STANDBY;
                }
            }
        }
    }

    update(timestamp) {
        // Calcular deltaTime para animações consistentes
        this.deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        // Limitar deltaTime para evitar saltos grandes em caso de lag
        if (this.deltaTime > 100) this.deltaTime = 100;

        // Atualizar animação
        this.frameTime += this.deltaTime;
        if (this.frameTime >= this.frameDuration) {
            this.frameIndex = (this.frameIndex + 1) % 4;
            this.frameTime = 0;
        }

        this.applyGravity(this.deltaTime);

        // Atualizar projéteis
        this.updateProjectiles(this.deltaTime);

        switch (this.action) {
            case this.VM_STANDBY:
                this.actionTime = 0;
                /* Verifique qual tecla está pressionada para mudar a ação*/
                if (this.keyState['ArrowLeft']) {
                    this.action = this.VM_WALK;
                    this.facingDirection = 'left';
                } else if (this.keyState['ArrowRight']) {
                    this.action = this.VM_WALK;
                    this.facingDirection = 'right';
                } else if (this.keyState['s']) {
                    this.action = this.VM_SHOOT;
                    this.createProjectile();
                } else if (this.keyState['j'] && !this.isJumping) {
                    this.action = this.VM_JUMP;
                    this.isJumping = true;
                    this.currentJumpVelocity = this.jumpVelocity;
                }
                break;
            case this.VM_WALK:
                this.actionTime += this.deltaTime;
                /* Movimentação*/
                if (this.keyState['ArrowRight']) {
                    this.screenPosition += 4 * (this.deltaTime / 16);
                    this.facingDirection = 'right';
                } else if (this.keyState['ArrowLeft']) {
                    this.screenPosition -= 4 * (this.deltaTime / 16);
                    this.facingDirection = 'left';
                } else {
                    this.action = this.VM_STANDBY;
                }
                /* Verificar outras ações durante a caminhada */
                if (this.keyState['s']) {
                    this.action = this.VM_SHOOT;
                    this.createProjectile();
                } else if (this.keyState['j'] && !this.isJumping) {
                    this.action = this.VM_JUMP;
                    this.isJumping = true;
                    this.currentJumpVelocity = this.jumpVelocity;
                }
                break;
            case this.VM_SHOOT:
                this.actionTime += this.deltaTime;
                if (this.actionTime >= 300) {
                    this.action = this.VM_STANDBY;
                }
                break;
            case this.VM_JUMP:
                this.actionTime += this.deltaTime;
                if (this.keyState['ArrowRight']) {
                    this.screenPosition += 4 * (this.deltaTime / 16);
                    this.facingDirection = 'right';
                } else if (this.keyState['ArrowLeft']) {
                    this.screenPosition -= 4 * (this.deltaTime / 16);
                    this.facingDirection = 'left';
                }
                if (this.keyState['s'] && this.actionTime % 300 < 16) {
                    this.createProjectile();
                }
                break;
        }

        this.drawAllSprites();
        requestAnimationFrame(this.update.bind(this)); // Importante o bind para manter o contexto da classe
    }

    init() {
        this.ctx.font = "16px Arial";
        this.screenPosition = 0; // Inicializa em 0 para fundo infinito
        this.lastFrameTime = performance.now();
        // Carregando as imagens
        this.images.personSpriteSheet.src = 'images/person.png';
        this.images.floor.src = 'images/chao.png';
        this.images.ceiling.src = 'images/teto.png';
        this.images.pillar.src = 'images/pilar.png';
        this.images.forest.src = 'images/floresta.png';

        // Controles
        window.addEventListener('keydown', (e) => {
            this.keyState[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keyState[e.key] = false;
        });

        // Chamar a função de visualização após as imagens serem carregadas
        this.images.personSpriteSheet.onload = () => {
            this.displaySpriteSheetPreview();
        };

        // Iniciar o loop de atualização
        requestAnimationFrame(this.update.bind(this));
    }
}

class Projectile {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = 8;
        this.width = 15;
        this.height = 8;
        this.active = true;
    }

    update(dt) {
        if (this.direction === 'right') {
            this.x += this.speed * (dt / 16);
        } else {
            this.x -= this.speed * (dt / 16);
        }

        // Desativar projéteis que saem da tela
        if (this.x < 0 || this.x > game.canvas.width) { // Usar game.canvas
            this.active = false;
        }
    }

    draw() {
        game.ctx.fillStyle = '#0099ff'; // Usar game.ctx
        game.ctx.beginPath();
        game.ctx.ellipse(this.x, this.y, this.width, this.height, 0, 0, Math.PI * 2);
        game.ctx.fill();

        // Efeito de brilho
        game.ctx.fillStyle = '#99ccff'; // Usar game.ctx
        game.ctx.beginPath();
        game.ctx.ellipse(this.x, this.y, this.width * 0.5, this.height * 0.5, 0, 0, Math.PI * 2);
        game.ctx.fill();
    }
}

// Instanciar a classe do jogo para iniciá-lo
const game = new cls_game();        