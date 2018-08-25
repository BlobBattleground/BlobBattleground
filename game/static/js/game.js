class Player {
    constructor(id, view) {
        this.id = id;
        this.view = view;
    }
}

class KeyboardController {
    constructor(player, cursors) {
        this.player = player;
        this.cursors = cursors;
    }

    update() {
        const dir_map = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 }};
        const delta = { x: 0, y: 0 };

        for (let dir in this.cursors) {
            if (this.cursors[dir].isDown) {
                delta.x += dir_map[dir].x;
                delta.y += dir_map[dir].y;
            }
        }

        let view = this.player.view;
        view.body.velocity.x += delta.x * 100;
        view.body.velocity.y += delta.y * 100;
    }

    stateSnapshot() {
        let state = {
            id: this.player.id,
            posx: this.player.view.body.x,
            posy: this.player.view.body.y
        };
        return state;
    }
}

class NetworkController {
    constructor() {
        this.players = {};
    }

    addPlayer(player) {
        this.players[player.id] = player;
    }

    networkUpdate(players) {
        console.log('Network Update');
        console.log(players);
        for(let i = 0; i<players.length; i++){
            if(players[i].id == lobby.self_id)
                continue;
            let view = this.players[players[i].id].view;
            view.body.x = players[i].posx;
            view.body.y = players[i].posy;
        }
    }
}

let keyboardController = null;
let networkController = null;

class PlayState {
    constructor(initialPStates){
        this.initialPStates = initialPStates;
    }
    preload() {
        // load images and stuff here
    }

    createPlayerView(physics, initial_pos={x:0,y:0}) {
        let playerView = this.game.add.graphics(this.game.world.centerX, this.game.world.centerY);
        playerView.beginFill(0xFF4370, 1);
        playerView.drawCircle(initial_pos.x, initial_pos.y, 60);

        if (physics) {
            this.game.physics.enable(playerView, Phaser.Physics.ARCADE);
            playerView.body.drag.set(200);
            playerView.body.maxVelocity.set(200);
        }

        return playerView;
    }

    create() {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        networkController = new NetworkController();
        for(let i = 0; i<this.initialPStates.length; i++){
            if(this.initialPStates[i].id == lobby.self_id){
                let self_pos = {x:this.initialPStates[i].posx, y:this.initialPStates[i].posy};
                let player = new Player(lobby.self_id, this.createPlayerView(true, self_pos));
                let cursors = this.game.input.keyboard.createCursorKeys();
                keyboardController = new KeyboardController(player, cursors);
            }
            else {
                let pos = {x: this.initialPStates[i].posx, y: this.initialPStates[i].posy};
                let player = new Player(this.initialPStates[i].id, this.createPlayerView(true, pos));
                networkController.addPlayer(player);
            }
        }
        lobby.socket.on('game-update', (players) => {
            players = JSON.parse(players);
            networkController.networkUpdate(players);
            lobby.socket.emit('client-update', JSON.stringify(keyboardController.stateSnapshot()));
        });
    }

    update() {
        keyboardController.update();
    }
}

function gameSetup(players) {
    console.log(players);
    players = JSON.parse(players);

    const config = {
        renderer: Phaser.AUTO,
        width: 1020,
        height: 728,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 200 }
            }
        },
        state: new PlayState(players)
    };

    let game = new Phaser.Game(config);
    console.log('Created Phaser game');
}
