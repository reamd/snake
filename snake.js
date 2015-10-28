/**
 * Created by pisces on 15-12-15.
 */
"use strict";

(function (g) {

    const BLANK_TYPE   = 0;
    const SNAKE_TYPE   = 1;
    const FOOD_TYPE    = 2;
    const BARRIER_TYPE = 3;

    const UP    = 0;
    const RIGHT = 1;
    const DOWN  = 2;
    const LEFT  = 3;

    const STATUS_WAIT  = 0;
    const STATUS_RUN   = 1;
    const STATUS_PAUSE = 2;
    const STATUS_STOP  = 3;

    class Snake {
        constructor(opt) {
            if (this.debug) console.log('snake constructor', opt);

            this.width        = opt.width;
            this.height       = opt.height;
            this.timeout      = opt.timeout;
            this.renderArea   = opt.renderArea;
            this.renderSnake  = opt.renderSnake;
            this.gameOver     = opt.gameOver;
            this.eatFoodEvent = opt.eatFoodEvent || (()=> '');

            this.debug = opt.debug || false;

            this.area      = [];
            this.snake     = [];
            this.food      = [];
            this.foodStack = [];

            this.status = STATUS_WAIT; // 0:未开始 1:运行中 2:已结束 3:暂停
            this.direction  = opt.direction || RIGHT;
            this.setTimeout = null;

            // AI
            this.AI = opt.AI || false; // 默认不开启
            this.aiGetDirection = ()=> '';
            this.aiMove         = ()=> '';
            this.aiAddFood      = ()=>'';

            this.lock   = false;
            this.isMove = false;
        }

        init() {
            if (this.debug) console.log('snake init');

            this.area      = [];
            this.snake     = [];
            this.food      = [];
            this.foodStack = [];

            // init area
            for (let i = 0; i < this.height; i++) {
                var tmp = [];
                for (let j = 0; j < this.width; j++) {
                    tmp.push(BLANK_TYPE);
                }
                this.area[i] = tmp;
            }
            // init snake
            //var point = this.randomPoint(BLANK_TYPE);
            //var point = {x: parseInt(this.width / 2), y: parseInt(this.height / 2)};
            var point = {x: parseInt(this.width / 2), y: 1};
            if (point) {
                this.snake.unshift(point);
                // 渲染area & snake
                this._renderArea(point, SNAKE_TYPE);
                this._renderSnake();
            } else {
                throw 'snake init fail';
            }

            if (this.AI) {
                var ai              = SnakeAI({
                    debug: this.debug,
                    width: this.width,
                    height: this.height,
                    snake: {
                        x: point.x,
                        y: point.y
                    }
                });
                this.aiGetDirection = ai.getDirection;
                this.aiMove         = ai.move;
                this.aiAddFood      = ai.addFood;
            }
        }

        random(max) {
            return parseInt(Math.random() * max);
        }

        randomPoint(type) {
            if (this.debug) console.log('snake randomPoint');

            var w   = this.width;
            var h   = this.height;
            var sum = w * h - this.snake.length - this.food.length;
            if (sum <= 0) return false; // 没有空白点

            var index = this.random(sum - 1);
            var x     = 0, y = 0;
            while (index >= 0) {
                if (this.area[y][x] == type) index--;
                if (index < 0) break;
                if (++x >= w) {
                    x = 0;
                    if (++y >= h) return false;
                }
            }
            return {x: x, y: y}
        }

        addFood() {
            if (this.debug) console.log('snake addFood');
            if (this.isMove) return;

            var point = this.randomPoint(BLANK_TYPE);
            if (point) {
                this.food.push(point);
                if (this.AI) this.aiAddFood(point);
                this._renderArea(point, FOOD_TYPE);
            }
            return point;
        }

        setDirection(direction) {
            if (this.debug) console.log('snake setDirection: ', direction);
            if (this.lock) return;
            if (direction != UP && direction != DOWN && direction != LEFT && direction != RIGHT) return false;
            if (this.snake.length > 1) {
                if ((this.direction == UP && direction == DOWN) ||
                    (this.direction == DOWN && direction == UP) ||
                    (this.direction == LEFT && direction == RIGHT) ||
                    (this.direction == RIGHT && direction == LEFT))
                    return false;
            }
            this.lock      = true;
            this.direction = direction;
            return true;
        }

        move(direction) {
            if (this.debug) console.log('snake move direction: ', direction);

            if (this.status != STATUS_RUN) return;
            if (this.isMove) return;
            if (direction !== undefined && this.setDirection(direction) == false) return;

            var header = {};
            header.x   = this.snake[0].x;
            header.y   = this.snake[0].y;
            if (this.direction == UP) header.y--;
            else if (this.direction == DOWN) header.y++;
            else if (this.direction == LEFT) header.x--;
            else if (this.direction == RIGHT) header.x++;
            else throw 'direction error';

            if (header.x < 0 || header >= this.width || header.y < 0 || header.y >= this.height) return this.stop(false);

            this.isMove = true;
            if (this.area[header.y][header.x] == BLANK_TYPE) {
                this.snake.unshift(header);
                this._renderArea(this.snake.pop(), BLANK_TYPE);
                this._renderArea(header, SNAKE_TYPE);
                if (this.AI) this.aiMove(this.direction);
            } else if (this.area[header.y][header.x] == FOOD_TYPE) {
                this.eatFoodEvent(header);
                this.area[header.y][header.x] = SNAKE_TYPE;
                this.snake.unshift(header);
                this._renderArea(header, SNAKE_TYPE);
                this.food = [];
                if (this.snake.length >= this.width * this.height) return this.stop(true);
                if (this.AI) this.aiMove(this.direction);
            } else { // game over
                return this.stop(false);
            }
            this._renderSnake();
            this.lock   = false;
            this.isMove = false;
            if (this.timeout) {
                this.setTimeout = setTimeout(()=> this.move(), this.timeout);
            }
        }

        run() {
            if (this.debug) console.log('snake run  status:', this.status);

            if (this.status != STATUS_WAIT && this.status != STATUS_PAUSE) return;
            this.status = STATUS_RUN;
            if (this.timeout) {
                this.setTimeout = setTimeout(()=> this.move(), this.timeout);
            }
        }

        pause() {
            if (this.debug) console.log('snake pause  status:', this.status);

            if (this.status != STATUS_RUN) return;
            this.status = STATUS_PAUSE;
            if (this.setTimeout) {
                clearTimeout(this.setTimeout);
                this.setTimeout = null;
            }
        }

        stop(win) {
            if (this.debug) console.log('snake stop  status:', this.status);

            if (this.status != STATUS_RUN && this.status != STATUS_PAUSE) return;
            this.status = STATUS_STOP;
            this.gameOver(win);
        }

        _renderArea(points, type) {
            if (this.debug) console.log('snake _renderArea');

            if (Object.prototype.toString.call(points) != '[object Array]') points = [points];
            points.forEach((p)=> {
                this.area[p.y][p.x] = type;
            });

            if (typeof this.renderArea != 'function') return;
            this.renderArea(points, type);
        }

        _renderSnake() {
            if (this.debug) console.log('snake _renderSnake');

            if (typeof this.renderSnake != 'function') return;
            this.renderSnake(this.snake);
        }
    }

    Snake.BLANK   = BLANK_TYPE;
    Snake.SNAKE   = SNAKE_TYPE;
    Snake.FOOD    = FOOD_TYPE;
    Snake.BARRIER = BARRIER_TYPE;

    Snake.UP    = UP;
    Snake.RIGHT = RIGHT;
    Snake.DOWN  = DOWN;
    Snake.LEFT  = LEFT;

    g.Snake = Snake;
})(window);