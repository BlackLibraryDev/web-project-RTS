

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }
    

    create() {
        // PreloadScene에서 미리 로드한 'playerSkin'을 그대로 사용합니다.
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;
        console.log(this.width, this.height);
    }

}