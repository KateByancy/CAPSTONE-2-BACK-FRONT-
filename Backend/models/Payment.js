class Payment {
    constructor(id, booking_id, amount, payment_method, status, created_at) {
        this.id = id;
        this.booking_id = booking_id;
        this.amount = amount;
        this.payment_method = payment_method;
        this.status = status;
        this.created_at = created_at;
    }
}

module.exports = Payment;