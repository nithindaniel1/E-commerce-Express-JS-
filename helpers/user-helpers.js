var db=require('../config/connections')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
const { ObjectId } = require('mongodb')
var objectId = require('mongodb').ObjectId

module.exports={
    doSignup:(userData)=>{
        //console.log(userData);
        return new Promise(async(resolve,reject)=>{
            //console.log(userData);
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.insertedId)
                req.session.loggedIn=true
                req.session.user=response
                res.redirect('/')
            })
        })
        
    },

    doLogin:(userData)=>{
        return new Promise(async (resolve,reject)=>{
            let loginStatus = false
            let response = {}
            let user =await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if (user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if (status){
                        console.log('Login Success');
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('Login failed');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
        })
    },

    addToCart:(proId,userId)=>{
        let proObj = {
            item:objectId(proId),
            quantity:1
        }

        // it check whether it has a cart document 

        return new Promise(async (resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                let proExist = userCart.products.findIndex(product=> product.item===proId)
                if (proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({
                        'products.item':objectId(proId)},
                        {
                            $inc:{'products.$.quantity':1}
                        }
                        ).then(()=>{
                            resolve()
                        })
                }else{
                        // If the cart exists
                        db.get().collection(collection.CART_COLLECTION)
                        .updateOne({user:ObjectId(userId)},
                            {

                                $push:{products:proObj}

                            }
                        ).then((response)=>{
                            resolve()
                        })
                }
            }else{
                // It will create a new cart doccument
                let cartObj={
                    user: objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },

    getCartProducts:(userId)=>{
        return new Promise (async(resolve,reject)=>{
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'$item',
                        foreignField:'_id',
                        as:'products'
                    }
                }
                // {
                //     $lookup:{
                //         from:collection.PRODUCT_COLLECTION,
                //         let :{prodList:'$products'},
                //         pipeline:[
                //             {
                //                 $match:{
                //                     $expr:{
                //                         $in:['$_id',"$$prodList"]
                //                     }
                //                 }
                //             }
                //         ],
                //         as:'cartItems'
                //     }
                // }
            ]).toArray()
            console.log(cartItems[0].products);
            resolve(cartItems[0].cartItems)
        })
    },

    getCartCount:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            let count=0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                // console.log(cart);
                count= cart.products.length
            }
            resolve(count)
        })
    }
}