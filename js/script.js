const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* Definição dos estados do jogo*/
const VM_STANDBY = 0;
const VM_WALK = 1;
const VM_SHOOT = 2;
const VM_JUMP = 3;

/* Inicializações*/
let facingDirection = 'right';
let action = VM_STANDBY;
let actionTime = 0;
let screenPosition = 0; // Removido o valor inicial 124 para fundo infinito
let keyState = {};
let isJumping = false;
let gravity = 0.5;
let jumpVelocity = -10;
let currentJumpVelocity = 0;
let groundLevel = canvas.height - 160;
let personY = groundLevel;
let personHeight = 160;
let lastFrameTime = performance.now();
let deltaTime = 0;
let frameIndex = 0;
let frameTime = 0;
const frameDuration = 100; // Duração de cada frame em ms

// Sistema de projéteis
const projectiles = [];

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
        
        // Desativar projéteis que saem da tela⠀
        if (this.x < 0 || this.x > canvas.width) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = '#0099ff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width, this.height, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Efeito de brilho
        ctx.fillStyle = '#99ccff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width * 0.5, this.height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Objeto para imagens
const images = {
    floor: new Image(),
    ceiling: new Image(),
    pillar: new Image(),
    forest: new Image(),
    personSpriteSheet: new Image()
};

// Configuração da spritesheet
const larguraDoFrame = 157;
const alturaDoFrame = 467 / 4;
const spriteFrames = {
    standby: [2],
    walk: [6,7],
    shoot: [12,11],
    jump: [16,17]
};

function getPersonSprite(frameIndex) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = larguraDoFrame;
    canvas.height = alturaDoFrame;

    const numColunas = 4;
    const linha = Math.floor(frameIndex / numColunas);
    const coluna = frameIndex % numColunas;
    const spriteX = coluna * larguraDoFrame;
    const spriteY = linha * alturaDoFrame;

    ctx.drawImage(
        images.personSpriteSheet,
        spriteX,
        spriteY,
        larguraDoFrame,
        alturaDoFrame,
        0,
        0,
        larguraDoFrame,
        alturaDoFrame
    );

    return canvas;
}

// Nova função para exibir amostra dos sprites
function displaySpriteSheetPreview() {
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
        
        const spriteCanvas = getPersonSprite(i);
        spriteCanvas.style.width = '78px';
        spriteCanvas.style.height = '80px';
        
        const label = document.createElement('span');
        label.textContent = frameLabels[i];
        
        frameDiv.appendChild(spriteCanvas);
        frameDiv.appendChild(label);
        previewContainer.appendChild(frameDiv);
    }
}

// Carregando as imagens
images.personSpriteSheet.src = 'images/person.png';
images.floor.src = 'images/chao.png';
images.ceiling.src = 'images/teto.png';
images.pillar.src = 'images/pilar.png';
images.forest.src = 'images/floresta.png';

// Controles
window.addEventListener('keydown', (e) => {
    keyState[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keyState[e.key] = false;
});

function drawBackground() {
    // Floresta (fundo com paralaxe)
    const forestWidth = images.forest.width; // Largura da imagem da floresta
    const parallaxSpeed = 0.5; // Velocidade de paralaxe
    let bgX1 = -(screenPosition * parallaxSpeed) % forestWidth;
    let bgX2 = bgX1 + forestWidth;
    ctx.drawImage(images.forest, bgX1, 0, forestWidth, canvas.height);
    ctx.drawImage(images.forest, bgX2, 0, forestWidth, canvas.height);

    // Teto e chão
    const tileSize = 32; // Tamanho do tile (32x32 pixels)
    const tilesPerScreen = Math.ceil(canvas.width / tileSize) + 1; // Tiles necessários para cobrir a tela + 1
    const tileOffset = (screenPosition % tileSize); // Offset para alinhar tiles
    const startTile = Math.floor(screenPosition / tileSize); // Índice do primeiro tile visível

    for (let i = 0; i < tilesPerScreen; i++) {
        let tileX = (i * tileSize) - tileOffset;
        ctx.drawImage(images.ceiling, tileX, -2, tileSize, tileSize);
        ctx.drawImage(images.floor, tileX, 232, tileSize, tileSize);
    }

    // Pilares
    const pillarSpacing = 125; // Espaçamento entre pilares
    const pillarsPerScreen = Math.ceil(canvas.width / pillarSpacing) + 1; // Pilares necessários
    const pillarOffset = (screenPosition % pillarSpacing); // Offset para alinhar pilares
    const startPillar = Math.floor(screenPosition / pillarSpacing); // Índice do primeiro pilar visível

    for (let i = 0; i < pillarsPerScreen; i++) {
        let pillarX = (i * pillarSpacing) - pillarOffset;
        ctx.drawImage(images.pillar, pillarX, 34, 21, 65);
        ctx.drawImage(images.pillar, pillarX, 99, 21, 65);
        ctx.drawImage(images.pillar, pillarX, 164, 21, 65);
    }
}

function drawPerson() {
    const personX = canvas.width / 2 - 78;
    let frames;
    switch (action) {
        case VM_STANDBY:
            frames = spriteFrames.standby;
            break;
        case VM_WALK:
            frames = spriteFrames.walk;
            break;
        case VM_SHOOT:
            frames = spriteFrames.shoot;
            break;
        case VM_JUMP:
            frames = spriteFrames.jump;
            break;
    }
    const currentFrame = frames[Math.floor(frameIndex) % frames.length];
    const sprite = getPersonSprite(currentFrame);
    if (facingDirection === 'left') {
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -personX - 78, personY + 54, 78, 80);
        ctx.scale(-1, 1);
    } else {
        ctx.drawImage(sprite, personX, personY + 54, 78, 80);
    }
}

function drawStatusLabel() {
    ctx.fillStyle = '#000000';
    ctx.fillText("Ação: " + (action === VM_STANDBY ? "Parado" :
        action === VM_WALK ? "Andando" :
        action === VM_SHOOT ? "Atirando" :
        "Pulando"), 10, 64);
    ctx.fillText("Tempo da ação: " + Math.round(actionTime), 10, 80);
    ctx.fillText("Posição da tela: " + Math.round(screenPosition), 10, 96);
    ctx.fillText("s = atirar; j = pular; setas = movimentar", 10, 112);
}

function drawAllSprites() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    // Desenhar projéteis ativos
    projectiles.forEach(projectile => {
        if (projectile.active) {
            projectile.draw();
        }
    });
    drawPerson();
    drawStatusLabel();
}

function createProjectile() {
    const personX = canvas.width / 2;
    const personWidth = 78;
    const projectileY = personY + personHeight / 2;
    let projectileX = facingDirection === 'right' ? personX + personWidth / 2 : personX - personWidth / 2;
    projectiles.push(new Projectile(projectileX, projectileY, facingDirection));
}

function updateProjectiles(dt) {
    // Atualizar posição dos projéteis
    projectiles.forEach(projectile => {
        if (projectile.active) {
            projectile.update(dt);
        }
    });
    // Remover projéteis inativos
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) {
            projectiles.splice(i, 1);
        }
    }
}

function applyGravity(dt) {
    if (isJumping) {
        personY += currentJumpVelocity * (dt / 16);
        currentJumpVelocity += gravity * (dt / 16);
        // Verificar se o personagem chegou ao chão
        if (personY >= groundLevel) {
            personY = groundLevel;
            isJumping = false;
            currentJumpVelocity = 0;
            // Se estava pulando, voltar para o estado parado
            if (action === VM_JUMP) {
                action = VM_STANDBY;
            }
        }
    }
}

function update(timestamp) {
    // Calcular deltaTime para animações consistentes
    deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    // Limitar deltaTime para evitar saltos grandes em caso de lag
    if (deltaTime > 100) deltaTime = 100;

    // Atualizar animação
    frameTime += deltaTime;
    if (frameTime >= frameDuration) {
        frameIndex = (frameIndex + 1) % 4;
        frameTime = 0;
    }

    applyGravity(deltaTime);
    
    // Atualizar projéteis
    updateProjectiles(deltaTime);

    switch (action) {
        case VM_STANDBY:
            actionTime = 0;
            /* Verifique qual tecla está pressionada para mudar a ação*/
            if (keyState['ArrowLeft']) {
                action = VM_WALK;
                facingDirection = 'left';
            } else if (keyState['ArrowRight']) {
                action = VM_WALK;
                facingDirection = 'right';
            } else if (keyState['s']) {
                action = VM_SHOOT;
                createProjectile();
            } else if (keyState['j'] && !isJumping) {
                action = VM_JUMP;
                isJumping = true;
                currentJumpVelocity = jumpVelocity;
            }
            break;
        case VM_WALK:
            actionTime += deltaTime;
            /* Movimentação*/
            if (keyState['ArrowRight']) {
                screenPosition += 4 * (deltaTime / 16);
                facingDirection = 'right';
            } else if (keyState['ArrowLeft']) {
                screenPosition -= 4 * (deltaTime / 16);
                facingDirection = 'left';
            } else {
                action = VM_STANDBY;
            }
            /* Verificar outras ações durante a caminhada */
            if (keyState['s']) {
                action = VM_SHOOT;
                createProjectile();
            } else if (keyState['j'] && !isJumping) {
                action = VM_JUMP;
                isJumping = true;
                currentJumpVelocity = jumpVelocity;
            }
            // Limites de screenPosition removidos para fundo infinito
            break;
        case VM_SHOOT:
            actionTime += deltaTime;
            if (actionTime >= 300) {
                action = VM_STANDBY;
            }
            break;
        case VM_JUMP:
            actionTime += deltaTime;
            if (keyState['ArrowRight']) {
                screenPosition += 4 * (deltaTime / 16);
                facingDirection = 'right';
            } else if (keyState['ArrowLeft']) {
                screenPosition -= 4 * (deltaTime / 16);
                facingDirection = 'left';
            }
            if (keyState['s'] && actionTime % 300 < 16) {
                createProjectile();
            }
            break;
    }

    drawAllSprites();
    requestAnimationFrame(update);
}

function init() {
    ctx.font = "16px Arial";
    screenPosition = 0; // Inicializa em 0 para fundo infinito
    lastFrameTime = performance.now();
    // Chamar a função de visualização após as imagens serem carregadas
    images.personSpriteSheet.onload = () => {
        displaySpriteSheetPreview();
    };
    update(lastFrameTime);
}
init();