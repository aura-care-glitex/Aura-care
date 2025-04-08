        // const { data: orderData, error: orderError } = await database
        //     .from("orders")
        //     .insert([{
        //         user_id: userId,
        //         total_price: totalPrice,
        //         number_of_items_bought: numberOfItemsBought,
        //         delivery_type: deliveryType,
        //         delivery_stage_id: deliveryType === "PSV" ? stageId : null,
        //         delivery_location: deliveryType === "PSV" ? stageName : deliveryLocation,
        //         store_address: deliveryType === "Express Delivery" ? storeAddress : null,
        //         county: deliveryType === "Outside Nairobi" ? county : null,
        //         delivery_fee: deliveryFee,
        //         order_status: "pending"
        //     }])
        //     .select("id")
        //     .single();

        // if (orderError || !orderData || !orderData.id) {
        //     return next(new AppError("Failed to create order", 500));
        // }

        // const orderId = orderData.id;

        // const orderedItemsInserts = orderItems.map(item => ({
        //     order_id: orderId,
        //     product_id: item.product_id,
        //     quantity: item.quantity,
        //     unit_price: item.unit_price
        // }));

        // const { error: orderedItemsError } = await database
        //     .from("order_items")
        //     .insert(orderedItemsInserts);

        // if (orderedItemsError) {
        //     return next(new AppError(`Error inserting ordered items: ${orderedItemsError.message}`, 500));
        // }