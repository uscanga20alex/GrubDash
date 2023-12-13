const path = require("path");
// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));
// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");
// TODO: Implement the /dishes handlers needed to make the tests pass

function list(req, res){
  const {dishId} = req.params;
    res.json({ data: dishes.filter(dishId ? dish => dish.id === dishId : () => true) });
};

function dishExists(req, res, next){ //middleware for specific dishId
    const { dishId } = req.params;
    const findDish = dishes.find((dish) => dish.id === dishId);
    if(findDish){
        res.locals.dish = findDish;
        return next();
    }
    next({ //:dishId validation, how do I do for dishId and Route!!!
        status: 404,
        messager: `Dish does not exist: ${dishId}.`,
    });
};

function bodyDataHas(propertyName){
    return function (req, res, next){
        const { data = {} } = req.body;
        if(data[propertyName]){
            return next();
        } 
        next({
            status: 400,
            message: `Dish must include ${propertyName}`,
        })
    }
}

function hasValidId(req, res, next){
    const { dishId } = req.params;
    const { data: {id} = {} } = req.body;
    if(id && id !== dishId){
       next({
        status: 400,
        message: `Doesn't match id ${id} `
    }) 
    }
    next();
}

function create(req, res, next){
    const {data: {name, description, price, image_url} = {} } = req.body;
    const newDishId = nextId(); //is this the correct way to add a new ID, and if so do I need to import ordersId?
    if (!price || price <= 0 || !Number.isInteger(price)) {
          return next({
              status: 400,
              message: "Dish must have a price that is an integer greater than 0",
          });
      }
    const newDish = {
        id: newDishId,
        name: name,
        description: description,
        price: price,
        image: image_url,
    }
    dishes.push(newDish);
    res.status(201).send({data:newDish})
}

function read(req, res){
    res.json({ data: res.locals.dish}) //I'm following my notes, why exactly do I need this, EXPLAIN
} //do I need to use res.locals.dish.id instead to get the current dish???

function update(req, res, next){
    const dish = res.locals.dish; //do I need dish or dishES
    const { data: {name, description, price, image_url} = {} } = req.body;
  if (!price || price <= 0 || !Number.isInteger(price)) {
        return next({
            status: 400,
            message: "Dish must have a price that is an integer greater than 0",
        });
    }

    dish.name = name;
    dish.description = description;
    dish.price = price;
    dish.image_url = image_url;
    res.json({data: dish});
}


module.exports = {
    list,
    create: [
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        bodyDataHas("image_url"),
        create,
    ],
    read: [dishExists, read],
    update: [
        dishExists,
        hasValidId,
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        bodyDataHas("image_url"),
        update,
    ],
    dishExists
}