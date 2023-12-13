const path = require("path");
// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res){
    res.json({data: orders});
}

function orderExists(req, res, next){
    const { orderId } = req.params;
    const orderFound = orders.find((order) => order.id === orderId);
    if (orderFound){
        res.locals.order = orderFound;
        return next();
    }
    next({
        status: 404,
        message: `Order not found: ${orderId}`,
    });
}

function orderHasBody(propertyName){
    return function(req, res, next){
        const {data = {} } = req.body;
        if (data[propertyName]){
            return next();
        }
        next({
            status: 400,
            message: `Order must include ${propertyName}`,
        })
    }
}

function validationQuantity(req, res, next) {
    const { data = {} } = req.body;
    const { dishes } = data;
    if (!Array.isArray(dishes) || dishes.length === 0) {
        return next({
            status: 400,
            message: "Order must include a non-empty dishes array",
        });
    }
    for (let i = 0; i < dishes.length; i++) {
        const { quantity } = dishes[i];

        if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
            return next({
                status: 400,
                message: `Dish ${i} must have a quantity that is an integer greater than 0`,
            });
        }
    }
    next();
}

function updateStatus(status){
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
  return validStatus.includes(status);
}

function status(req, res, next){
  const order = res.locals.order;
  const { orderId } = req.params;
  const { data  = {} } = req.body;
  const { deliverTo, mobileNumber, status, dishes } = data;
  const statusUpdate = updateStatus(status);
  if (!deliverTo || !mobileNumber || !statusUpdate || deliverTo.trim() === "" || mobileNumber.trim() === "" || status.trim() === "") {
        return next({
            status: 400,
            message: "deliverTo, mobileNumber, and status are required fields",
        });
    }
    if(data.id && data.id !== orderId){
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${data.id}, Route: ${orderId}`,
        });
    }
    if(status === "delivered" && order.status !== "pending"){
        return next({
            status: 400,
            message: "A delivered order cannot be charged",
        })
    }
    if (status === "delivered") {
      order.status = status;
      return res.json({data: order})
    }
  next();
}

//does this needs all the data names found in data-orders???
function create(req, res, next){
    const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
    for (let i = 0; i < dishes.length; i++) {
        const { quantity } = dishes[i];
        if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
            return next({
                status: 400,
                message: `Dish ${i} must have a quantity that is an integer greater than 0`,
            });
        }
    }
    const newOrderId = nextId();
    const newOrder = {
      id: newOrderId,
      deliverTo: deliverTo,
      mobileNumber: mobileNumber,
      dishes: dishes,
    }
    orders.push(newOrder);
    res.status(201).json({data:newOrder})
}

function read(req, res){
    res.json({data: res.locals.order})
}
//look over this, do I need to add the specific names of the data-orders??? Validation needs 1 more to be added, how though
function update(req, res, next){
    const order = res.locals.order;
    const { orderId } = req.params;
    const { data  = {} } = req.body;
    const { deliverTo, mobileNumber, status, dishes } = data;
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.dishes = dishes;
    
    res.json({data: order});
}
//look over this
function destroy(req, res, next){
    const {orderId} = res.locals.order;
    const index = orders.findIndex((order) => order.id === res.locals.order.id);
    if(index === -1){
        return next({
            status: 400,
            message: "An order cannot be deleted unless it is pending",
        })
    }
    if(res.locals.order.status !== "pending"){
        return next({
          status: 400,
          message: "pending",
        })
    }
    orders.splice(index, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    orderExists,
    orderHasBody,
    validationQuantity,
    create: [ //is this all here or do I neex to add some qyantity type
        validationQuantity,
        orderHasBody("deliverTo"),
        orderHasBody("mobileNumber"),
        orderHasBody("dishes"),
        create,
    ],
    read: [orderExists, read],
    update: [
      orderExists, 
      validationQuantity,
      status,
      orderHasBody("deliverTo"),
      orderHasBody("mobileNumber"),
      orderHasBody("dishes"),
      update
    ],
    delete: [orderExists, destroy],
};