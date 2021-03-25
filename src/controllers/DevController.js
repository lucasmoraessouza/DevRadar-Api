const axios = require("axios");
const Dev = require("../models/dev");
const parseStringAsArray = require("../utils/parseStringAsArray");
const { findConnections, sendMessage } = require("../websocket");

//index, show, store, update, destroy

module.exports = {
  async index(request, response) {
    const devs = await Dev.find();

    return response.json(devs);
  },
  async update(request, response) {
    try {
      const { id } = request.params;
      const { name } = request.body;
      const { bio } = request.body;
      const { techs } = request.body;

      const newValues = await Dev.findByIdAndUpdate(
        id,
        {
          name,
          bio,
          techs,
        },
        { new: true }
      );
      await newValues.save();
      return response.json({ message: "Dados alterados." });
    } catch (err) {
      console.log(err);
    }
  },

  async destroy(request, response) {
    try {
      const { id } = request.params;
      await Dev.findByIdAndRemove(id);
      return response.json({ message: "Usuario excluido." });
    } catch (err) {
      console.log(err);
    }
  },

  async store(request, response) {
    const { github_username, techs, latitude, longitude } = request.body;

    let dev = await Dev.findOne({ github_username });
    console.log(dev);
    if (dev === null) {
      const apiResponse = await axios.get(
        `https://api.github.com/users/${github_username}`
      );
      //continuar
      const { name = login, avatar_url, bio } = apiResponse.data;

      const techsArray = parseStringAsArray(techs);

      const location = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      dev = await Dev.create({
        github_username,
        name,
        avatar_url,
        bio,
        techs: techsArray,
        location,
      });
      //filtrar as conexões que estão há no máximo 10 km de distância, e que o novo dev tenha pelo menos uma das tecnologias
      // filtradas
      const sendSocketMessageTo = findConnections(
        { latitude, longitude },
        techsArray
      );
      sendMessage(sendSocketMessageTo, "new-dev", dev);

      return response.json(dev);
    }
    return;
  },
};
