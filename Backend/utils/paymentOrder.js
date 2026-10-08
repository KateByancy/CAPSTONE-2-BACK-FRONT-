function paymentTime(payment) {
    const timestamp = payment.status === 'Paid'
        ? payment.reviewed_at || payment.submitted_at || payment.created_at
        : payment.submitted_at || payment.created_at;
    const milliseconds = new Date(timestamp).getTime();
    return Number.isFinite(milliseconds) ? milliseconds : 0;
}

module.exports = function latestPaymentFirst(left, right) {
    const hasPayment = payment => Boolean(payment.submitted_at) || payment.status === 'Paid';
    return Number(hasPayment(right)) - Number(hasPayment(left))
        || paymentTime(right) - paymentTime(left)
        || Number(right.id) - Number(left.id);
};
