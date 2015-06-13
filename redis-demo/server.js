var redis = require("redis"),
    async = require("async"),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    client = redis.createClient();

/******************************************** 
*USER REDIS FUNCTIONS 
********************************************/

var nuevoUsuario = function(username, mail, callback){
    client.incr("user:", function(err, newkey){
        
       client.hmset("user:"+newkey, {
           id : newkey,
           nombre : username,
           mail : mail
       });

       client.sadd("users", newkey);
        
       client.publish("nuevo usuario", username);
        
       callback(null, {userKey : newkey});  
    });
};

var getUsers = function(callback){
    var usuarios = [];
    
    var getUserHash = function(userKey, done){
        client.hgetall("user:"+userKey, function(err, user){
            if(!err){
                usuarios.push(user);
                done();
            }else{
                console.log(err);
                done(err);
            }
        });
    };
    
    client.smembers("users", function(err, users){
        async.each(users, getUserHash, function(){
            callback(null, usuarios);
        });
    });
};

var getUser = function(userKey, callback){
    client.hgetall("user:"+userKey, function(err, user){
        if(!err){
            callback(null, user);
        }else{
            callback(true, err);
        }
    });
};

var updateUser = function(user, callback){
    client.hmset("user:"+user.id, {
           id : user.id,
           nombre : user.nombre,
           mail : user.mail
    }, function(err, result){
        callback(null, result);
    });
};

var deleteUser = function(id, callback){
    async.series([
        function(done){
            client.del("user:"+id, function(err, result){
                done(null, result);
            });
        },
        function(done){
            client.srem("users", id, function(err, result){
                done(null, result);
            });
        },
    ],
    function(err, data){
       callback(null, data);  
    });
};

client.on("error", function (err) {
    console.log("Error " + err);
});

/******************************************** 
*USER API ROUTES
********************************************/
var router = express.Router();

router.get('/', function(req, res) {
    res.json({ message: 'bienvenido al API de usuarios' });   
});

router.get('/user', function(req, res) {
    getUsers(function(err, usuarios){
        res.json({ usuarios: usuarios });
    });
});

router.get('/user/:id', function(req, res) {
    getUser(req.params.id, function(err, usuario){
        res.json({ usuario: usuario });
    });
});

router.post('/user', function(req, res) {
    nuevoUsuario(req.body.nombre, req.body.mail, function(err, data){
        if(!err){
            res.json({ 
                mensaje : "usuario creado",
                id: data.userKey
            });
        }else{
            res.json({ mensaje : "error creando usuario" });
        }
    });
});

router.put('/user/:id', function(req, res) {
    var user = {
        id : req.params.id,
        nombre : req.body.nombre,
        mail : req.body.mail
    };
    updateUser(user, function(err, data){
        if(!err){
            res.json({ mensaje : "usuario actualizado" });
        }else{
            res.json({ mensaje : "error actualizando usuario" });
        }
    });
});

router.delete('/user/:id', function(req, res){
    deleteUser(req.params.id, function(err, data){
        if(!err){
            res.json({ mensaje : "usuario eliminado" });
        }else{
            res.json({ mensaje : "error eliminando usuario" });
        }
    });
});

/******************************************** 
*Express Server Config 
********************************************/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;
              
app.use('/api', router);

app.listen(port);
console.log('Servidor corriendo en ' + port);