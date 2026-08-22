class User {
    constructor(id, fullname, phone, address, email, password) {
        this.id = id;
        this.fullname = fullname;
        this.phone = phone;
        this.address = address;
        this.email = email;
        this.password = password;
    }
}

module.exports = User;