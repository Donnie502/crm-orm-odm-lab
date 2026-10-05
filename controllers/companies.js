const { Company, Contact } = require('../models/sequelize');

async function getAll(req, res) {
  const where = {};

  if (req.query.industry) {
    where.industry = req.query.industry;
  }

  const companies = await Company.findAll({ where, order: [['id', 'ASC']] });

  res.status(200).json(companies);
}

async function getById(req, res) {
  const company = await Company.findByPk(req.params.id, {
    include: [{ model: Contact, as: 'contacts' }]
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.status(200).json(company);
}

async function create(req, res) {
  const { name, industry, salesPersonId } = req.body;
  const company = await Company.create({ name, industry, salesPersonId });

  res.status(201).json(company);
}

async function update(req, res) {
  const company = await Company.findByPk(req.params.id);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  await company.update(req.body, { fields: ['name', 'industry', 'salesPersonId'] });

  res.status(200).json(company);
}

async function remove(req, res) {
  const deleted = await Company.destroy({ where: { id: req.params.id } });

  if (deleted === 0) {
    return res.status(404).json({ error: 'Company not found' });
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
