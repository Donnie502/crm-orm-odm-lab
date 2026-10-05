const { Contact } = require('../models/sequelize');

async function getAll(req, res) {
  const contacts = await Contact.findAll({ order: [['id', 'ASC']] });

  res.status(200).json(contacts);
}

async function getById(req, res) {
  const contact = await Contact.findByPk(req.params.id);

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.status(200).json(contact);
}

async function create(req, res) {
  const { firstName, lastName, email, phone, companyId } = req.body;
  const contact = await Contact.create({ firstName, lastName, email, phone, companyId });

  res.status(201).json(contact);
}

async function update(req, res) {
  const contact = await Contact.findByPk(req.params.id);

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  await contact.update(req.body, {
    fields: ['firstName', 'lastName', 'email', 'phone', 'companyId']
  });

  res.status(200).json(contact);
}

async function remove(req, res) {
  const deleted = await Contact.destroy({ where: { id: req.params.id } });

  if (deleted === 0) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.status(204).send();
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
