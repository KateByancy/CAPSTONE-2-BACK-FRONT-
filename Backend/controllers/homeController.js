const getHome = (req, res) => {
    res.json({
        success: true,
        company: "MARC Interior Design",
        slogan: "Let's start something beautiful.",
        services: [
            {
                id: 1,
                title: "Book Design",
                icon: "book"
            },
            {
                id: 2,
                title: "Portfolio",
                icon: "image"
            },
            {
                id: 3,
                title: "Track Project",
                icon: "track"
            },
            {
                id: 4,
                title: "Chat Assistant",
                icon: "chat"
            }
        ]
    });
};

module.exports = {
    getHome
};