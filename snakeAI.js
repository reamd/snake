/**
 * Created by pisces on 15-12-17.
 */
"use strict";

(function (g) {

    function initArray(len, v) {
        var tmp = [], value = v || 0;
        for (var i = 0; i < len; i++) {
            tmp.push(value);
        }
        return tmp;
    }

    function SnakeAI(snakeGame) {
        var debug = snakeGame.debug || false;

        const HEAD = 0; // 蛇头

        const WIDTH      = snakeGame.width + 2;
        const HEIGHT     = snakeGame.height + 2;
        const FIELD_SIZE = WIDTH * HEIGHT;

        const FOOD      = 0;
        const UNDEFINED = (WIDTH + 1) * (HEIGHT + 1);
        const SNAKE     = UNDEFINED * 2;

        const LEFT  = -1;
        const RIGHT = 1;
        const UP    = -WIDTH;
        const DOWN  = WIDTH;

        // 运动方向数组
        var mov = [LEFT, RIGHT, UP, DOWN];

        const ERR = -999999;

        /* 用一维数组来表示二维的东西
         board表示蛇运动的矩形场地
         初始化蛇头在(1,1)的地方，第0行，HEIGHT行，第0列，WIDTH列为围墙，不可用
         初始蛇长度为1
         */
        var board      = initArray(FIELD_SIZE);
        var snake      = initArray(FIELD_SIZE + 1);
        snake[HEAD]    = (snakeGame.snake.y + 1) * WIDTH + ( snakeGame.snake.x + 1);
        var snake_size = 1;
        // 与上面变量对应的临时变量，蛇试探性地移动时使用
        var tmpboard      = initArray(FIELD_SIZE);
        var tmpsnake      = initArray(FIELD_SIZE + 1);
        tmpsnake[HEAD]    = (snakeGame.snake.y + 1) * WIDTH + (snakeGame.snake.x + 1);
        var tmpsnake_size = 1;

        // food:食物位置(0~FIELD_SIZE-1),初始在(3, 3)
        // best_move: 运动方向
        //var food = 3 * WIDTH + 3;
        var food = null;

        // 检查一个cell有没有被蛇身覆盖，没有覆盖则为free，返回true
        function is_cell_free(idx, psize, psnake) {
            var tmp = [];
            for (var i = 0; i < psize; i++) {
                tmp.push(psnake[i]);
            }
            return (tmp.indexOf(idx) == -1);
        }

        // 检查某个位置idx是否可向move方向运动
        function is_move_possible(idx, move) {
            if (move == LEFT) return (idx % WIDTH > 1);
            else if (move == RIGHT) return (idx % WIDTH < (WIDTH - 2));
            else if (move == UP) return (idx > (2 * WIDTH - 1)); // 即idx/WIDTH > 1
            else if (move == DOWN) return idx < (FIELD_SIZE - 2 * WIDTH); // 即idx/WIDTH < HEIGHT-2
            else return false;
        }

        // 重置board
        // board_refresh后，UNDEFINED值都变为了到达食物的路径长度
        // 如需要还原，则要重置它
        function board_reset(psnake, psize, pboard) {
            if (debug) console.log('SnakeAI board_reset');
            for (var i = 0; i < FIELD_SIZE; i++) {
                if (i == food) pboard[i] = FOOD;
                else if (is_cell_free(i, psize, psnake)) pboard[i] = UNDEFINED; // 该位置为空
                else pboard[i] = SNAKE; // 该位置为蛇身
            }
        }

        // 广度优先搜索遍历整个board，
        // 计算出board中每个非SNAKE元素到达食物的路径长度
        function board_refresh(pfood, psnake, pboard) {
            if (debug) console.log('SnakeAI board_refresh');
            var queue = [pfood], inQueue = initArray(FIELD_SIZE), found = false;
            while (queue.length > 0) {
                var idx = queue.shift();
                if (inQueue[idx] == 1) continue;
                inQueue[idx] = 1;
                for (var i = 0; i < 4; i++) {
                    if (is_move_possible(idx, mov[i])) {
                        if (idx + mov[i] == psnake[HEAD]) found = true; // 找到路径
                        if (pboard[idx + mov[i]] < SNAKE) {  //如果该点不是蛇的身体
                            if (pboard[idx + mov[i]] > pboard[idx] + 1) pboard[idx + mov[i]] = pboard[idx] + 1;
                            if (inQueue[idx + mov[i]] == 0) queue.push(idx + mov[i]);
                        }
                    }
                }
            }
            return found;
        }

        // 从蛇头开始，根据board中元素值，
        // 从蛇头周围4个领域点中选择最短路径
        function choose_shortest_safe_move(psnake, pboard) {
            if (debug) console.log('SnakeAI choose_shortest_safe_move');
            var best_move = ERR, min = SNAKE;
            for (var i = 0; i < 4; i++) {
                if (is_move_possible(psnake[HEAD], mov[i]) && pboard[psnake[HEAD] + mov[i]] < min) {
                    min       = pboard[psnake[HEAD] + mov[i]];
                    best_move = mov[i];
                }
            }
            return best_move
        }

        // 从蛇头开始，根据board中元素值，
        // 从蛇头周围4个领域点中选择最远路径
        function choose_longest_safe_move(psnake, pboard) {
            if (debug) console.log('SnakeAI choose_longest_safe_move');
            var best_move = ERR, max = -1;
            for (var i = 0; i < 4; i++) {
                //var tmp = new Date().getTime();
                //for (var index = 0; index < 4; index++) {
                //    var i = (tmp + index) % 4;
                if (is_move_possible(psnake[HEAD], mov[i]) && pboard[psnake[HEAD] + mov[i]] < UNDEFINED && pboard[psnake[HEAD] + mov[i]] > max) {
                    max       = pboard[psnake[HEAD] + mov[i]];
                    best_move = mov[i];
                }
                //if (is_move_possible(psnake[HEAD], mov[i]) && pboard[psnake[HEAD] + mov[i]] < UNDEFINED) {
                //    max       = pboard[psnake[HEAD] + mov[i]];
                //    best_move = mov[i];
                //    break;
                //}
            }
            return best_move
        }

        // 检查是否可以追着蛇尾运动，即蛇头和蛇尾间是有路径的
        // 为的是避免蛇头陷入死路
        // 虚拟操作，在tmpboard,tmpsnake中进行
        function is_tail_inside() {
            if (debug) console.log('SnakeAI is_tail_inside');
            tmpboard[tmpsnake[tmpsnake_size - 1]] = 0;  // 虚拟地将蛇尾变为食物(因为是虚拟的，所以在tmpsnake,tmpboard中进行)
            tmpboard[food] = SNAKE;  // 放置食物的地方，看成蛇身
            var result = board_refresh(tmpsnake[tmpsnake_size - 1], tmpsnake, tmpboard);  // 求得每个位置到蛇尾的路径长度
            for (var i = 0; i < 4; i++) {  // 如果蛇头和蛇尾紧挨着，则返回False。即不能follow_tail，追着蛇尾运动了
                if (is_move_possible(tmpsnake[HEAD], mov[i]) && tmpsnake[HEAD] + mov[i] == tmpsnake[tmpsnake_size - 1] && tmpsnake_size > 3)
                    result = false;
            }
            return result;
        }

        // 让蛇头朝着蛇尾运行一步
        // 不管蛇身阻挡，朝蛇尾方向运行
        function follow_tail() {
            if (debug) console.log('SnakeAI follow_tail');
            tmpsnake_size = snake_size;
            tmpsnake      = [].concat(snake);
            board_reset(tmpsnake, tmpsnake_size, tmpboard);  // 重置虚拟board
            tmpboard[tmpsnake[tmpsnake_size - 1]] = FOOD;  // 让蛇尾成为食物
            tmpboard[food] = SNAKE;  // 让食物的地方变成蛇身
            board_refresh(tmpsnake[tmpsnake_size - 1], tmpsnake, tmpboard);  // 求得各个位置到达蛇尾的路径长度
            tmpboard[tmpsnake[tmpsnake_size - 1]] = SNAKE;  // 还原蛇尾

            return choose_longest_safe_move(tmpsnake, tmpboard);  // 返回运行方向(让蛇头运动1步)
        }

        // 在各种方案都不行时，随便找一个可行的方向来走(1步)
        function any_possible_move() {
            if (debug) console.log('SnakeAI any_possible_move');
            var best_move = ERR, min = SNAKE;
            board_reset(snake, snake_size, board);
            board_refresh(food, snake, board);
            var tmp = new Date().getTime();
            for (var index = 0; index < 4; index++) {
                //var i = (tmp + index) % 4;
                var i = index;
                if (is_move_possible(snake[HEAD], mov[i]) && board[snake[HEAD] + mov[i]] < min) {
                    min       = board[snake[HEAD] + mov[i]];
                    best_move = mov[i];
                }
            }
            return best_move;
        }

        function shift_array(arr, size) {
            for (var i = size; i > 0; i--) {
                arr[i] = arr[i - 1];
            }
        }

        function new_food(point) {
            if (debug) console.log('SnakeAI new_food');
            if (fakeFlag) throw 'AI: move';
            console.log(point);
            food = (point.y + 1) * WIDTH + (point.x + 1);
            if (!is_cell_free(food, snake_size, snake)) {
                food = null;
                throw 'AI: new food error';
            }
        }

        // 真正的蛇在这个函数中，朝pbest_move走1步
        function make_move(pbest_move) {
            if (debug) console.log('SnakeAI make_move');
            shift_array(snake, snake_size);
            snake[HEAD] += pbest_move;

            // 如果新加入的蛇头就是食物的位置
            // 蛇长加1  重置board(因为原来那些路径长度已经用不上了)
            if (food !== null && snake[HEAD] == food) {
                food               = null;
                board[snake[HEAD]] = SNAKE;  // 新的蛇头
                snake_size += 1;
            } else {
                board[snake[HEAD]] = SNAKE;  // 新的蛇头
                board[snake[snake_size]] = UNDEFINED;  // 蛇尾变为空格
            }
        }

        // 虚拟地运行一次，然后在调用处检查这次运行可否可行
        // 可行才真实运行。
        // 虚拟运行吃到食物后，得到虚拟下蛇在board的位置
        function virtual_shortest_move() {
            if (debug) console.log('SnakeAI virtual_shortest_move');
            tmpsnake_size = snake_size;
            tmpsnake      = [].concat(snake);  // 如果直接tmpsnake=snake，则两者指向同一处内存
            tmpboard = [].concat(board);  // board中已经是各位置到达食物的路径长度了，不用再计算
            board_reset(tmpsnake, tmpsnake_size, tmpboard);

            var food_eated = false;
            while (!food_eated) {
                if (debug) console.log('SnakeAI virtual_shortest_move');
                board_refresh(food, tmpsnake, tmpboard);
                var move = choose_shortest_safe_move(tmpsnake, tmpboard);
                if (move == ERR) {
                    console.log(tmpsnake);
                    console.log(tmpsnake_size);
                    console.log(tmpboard);
                    //return false;
                    throw 'hahahahahahaaha';
                }
                shift_array(tmpsnake, tmpsnake_size);
                tmpsnake[HEAD] += move; // 在蛇头前加入一个新的位置
                // 如果新加入的蛇头的位置正好是食物的位置
                // 则长度加1，重置board，食物那个位置变为蛇的一部分(SNAKE)
                if (tmpsnake[HEAD] == food) {
                    tmpsnake_size += 1;
                    board_reset(tmpsnake, tmpsnake_size, tmpboard);  // 虚拟运行后，蛇在board的位置(label101010)
                    tmpboard[food] = SNAKE;
                    food_eated     = true;
                } else {  //如果蛇头不是食物的位置，则新加入的位置为蛇头，最后一个变为空格
                    tmpboard[tmpsnake[HEAD]]          = SNAKE;
                    tmpboard[tmpsnake[tmpsnake_size]] = UNDEFINED;
                }
            }
        }

        // 如果蛇与食物间有路径，则调用本函数
        function find_safe_way() {
            if (debug) console.log('SnakeAI find_safe_way');
            var safe_move = ERR;
            // 虚拟地运行一次，因为已经确保蛇与食物间有路径，所以执行有效
            // 运行后得到虚拟下蛇在board中的位置，即tmpboard，见label101010
            virtual_shortest_move();  // 该函数唯一调用处
            if (is_tail_inside()) {  // 如果虚拟运行后，蛇头蛇尾间有通路，则选最短路运行(1步)
                return choose_shortest_safe_move(snake, board);
            }
            safe_move = follow_tail(); // 否则虚拟地follow_tail 1步，如果可以做到，返回true
            return safe_move;
        }

        var fakeFlag = false;

        function addFakeFood() {
            if (debug) console.log('SnakeAI addFakeFood');
            if (food !== null) return;
            if (FIELD_SIZE - snake_size <= 0) throw 'AI: game over';
            var cell_free = false;
            for (var i = WIDTH; i < FIELD_SIZE; i++) {
                if (i % WIDTH == WIDTH - 1 || i % WIDTH == 0 || i % HEIGHT == HEIGHT - 1 || i % HEIGHT == 0) continue;
                food      = i;
                cell_free = is_cell_free(food, snake_size, snake);
                if (cell_free) break;
            }
            fakeFlag = true;
        }

        function restoreFood() {
            if (debug) console.log('SnakeAI restoreFood');
            if (fakeFlag) food = null;
            fakeFlag = false;
        }

        function getDirection() {
            if (debug) console.log('SnakeAI getDirection');
            var best_move = ERR;
            addFakeFood();
            // 重置矩阵
            board_reset(snake, snake_size, board);

            // 如果蛇可以吃到食物，board_refresh返回true
            // 并且board中除了蛇身(=SNAKE)，其它的元素值表示从该点运动到食物的最短路径长
            if (board_refresh(food, snake, board)) {
                best_move = find_safe_way();  // find_safe_way的唯一调用处
            } else {
                best_move = follow_tail();
            }

            if (best_move == ERR) best_move = any_possible_move();
            restoreFood();

            if (best_move == UP) return Snake.UP;
            if (best_move == DOWN) return Snake.DOWN;
            if (best_move == LEFT) return Snake.LEFT;
            if (best_move == RIGHT) return Snake.RIGHT;
            console.log(snake);
            console.log(snake_size);
            console.log(board);
            return best_move;
        }

        function move(dir) {
            if (debug) console.log('SnakeAI move');
            if (fakeFlag) throw 'AI: move';
            var best_move;
            if (dir == Snake.UP) best_move = UP;
            else if (dir == Snake.DOWN) best_move = DOWN;
            else if (dir == Snake.LEFT) best_move = LEFT;
            else if (dir == Snake.RIGHT) best_move = RIGHT;
            else return;
            make_move(best_move);
        }

        return {
            getDirection: getDirection,
            move: move,
            addFood: new_food
        };
    }


    g.SnakeAI = SnakeAI;
})(window);
