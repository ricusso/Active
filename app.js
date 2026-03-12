require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const sequelize = require('./config/database');
const User = require('./models/User');
const Quest = require('./models/Quest');
const Enrollment = require('./models/Enrollment');
const Task = require('./models/Task');
const Notification = require('./models/Notification');
const ChatMessage = require('./models/ChatMessage');

User.hasMany(Enrollment, { foreignKey: 'userId' });
Enrollment.belongsTo(User, { foreignKey: 'userId' });
Quest.hasMany(Enrollment, { foreignKey: 'questId' });
Enrollment.belongsTo(Quest, { foreignKey: 'questId' });
Quest.hasMany(Task, { foreignKey: 'questId' });
Task.belongsTo(Quest, { foreignKey: 'questId' });
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });
Enrollment.hasMany(ChatMessage, { foreignKey: 'enrollmentId' });
ChatMessage.belongsTo(Enrollment, { foreignKey: 'enrollmentId' });

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'aktiv-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  if (req.session.user) {
    try {
      res.locals.unreadCount = await Notification.count({ where: { userId: req.session.user.id, is_read: false } });
    } catch (e) { res.locals.unreadCount = 0; }
  } else {
    res.locals.unreadCount = 0;
  }
  next();
});

app.get('/expert-profile/:id', async (req, res) => {
  const expert = await User.findByPk(req.params.id);
  if (!expert || expert.role !== 'expert') return res.status(404).render('pages/404', { title: 'Эксперт не найден' });
  const expertQuests = await Quest.findAll({ where: { creator_id: expert.id } });
  res.render('pages/expert-profile', { title: expert.name, expert, quests: expertQuests });
});

app.get('/chat/:enrollmentId', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  try {
    const enrollment = await Enrollment.findOne({
      where: { id: req.params.enrollmentId },
      include: [Quest, User]
    });
    if (!enrollment) return res.status(404).render('pages/404', { title: 'Чат не найден' });
    const messages = await ChatMessage.findAll({ where: { enrollmentId: enrollment.id }, order: [['createdAt', 'ASC']] });
    res.render('pages/chat', { title: 'Чат Актив', enrollment, messages });
  } catch (err) {
    res.redirect('/my-quests');
  }
});

app.post('/chat/:enrollmentId/send', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  const { message } = req.body;
  await ChatMessage.create({ enrollmentId: req.params.enrollmentId, senderId: req.session.user.id, senderRole: req.session.user.role, message });
  res.redirect(`/chat/${req.params.enrollmentId}`);
});

app.get('/settings', (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  res.render('pages/user-settings', { title: 'Личный кабинет' });
});

app.post('/settings/update', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  const { name, email, bio, expert_sphere } = req.body;
  const user = await User.findByPk(req.session.user.id);
  if (user) {
    user.name = name || user.name;
    user.email = email || user.email;
    user.bio = bio || user.bio;
    if (user.role === 'expert') user.expert_sphere = expert_sphere || user.expert_sphere;
    await user.save();
    req.session.user = user;
    res.redirect('/settings?success=1');
  }
});

app.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role, balance: 5000 });
  req.session.user = user;
  await Notification.create({ userId: user.id, title: 'Добро пожаловать!', message: 'Начните свое первое испытание!', type: 'system' });
  res.redirect(role === 'expert' ? '/expert/dashboard' : '/my-quests');
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email, password } });
  if (user) {
    req.session.user = user;
    res.redirect(user.role === 'expert' ? '/expert/dashboard' : '/my-quests');
  } else {
    res.redirect('/auth?error=invalid_creds');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/', (req, res) => res.render('pages/index', { title: 'Главная' }));
app.get('/auth', (req, res) => res.render('pages/auth', { title: 'Вход' }));

app.get('/checkout/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  try {
    const quest = await Quest.findByPk(req.params.id);
    if (!quest) return res.status(404).render('pages/404', { title: 'Квест не найден' });
    const existing = await Enrollment.findOne({ where: { userId: req.session.user.id, questId: quest.id } });
    if (existing) return res.redirect('/my-quests?info=already_enrolled');
    
    await Enrollment.create({ userId: req.session.user.id, questId: quest.id, status: 'active', is_paid: true });
    
    await Notification.create({ 
      userId: req.session.user.id, 
      title: quest.price > 0 ? 'Квест оплачен!' : 'Квест начат!', 
      message: `Вы успешно начали квест "${quest.title}".`, 
      type: 'system' 
    });

    if (quest.price > 0) {
      res.render('pages/paid', { title: 'Успешная оплата', quest });
    } else {
      res.redirect('/my-quests?success=enrolled');
    }
  } catch (err) {
    res.redirect('/quests?error=enrollment_failed');
  }
});

app.get('/quests', async (req, res) => {
  const allQuests = await Quest.findAll();
  res.render('pages/quests-catalog', { title: 'Каталог квестов', quests: allQuests });
});

app.get('/my-quests', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  const enrollments = await Enrollment.findAll({ where: { userId: req.session.user.id }, include: [Quest] });
  res.render('pages/my-quests', { title: 'Мои квесты', enrollments });
});

app.get('/quest-dashboard/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  const enrollment = await Enrollment.findOne({ where: { id: req.params.id, userId: req.session.user.id }, include: [Quest] });
  if (!enrollment) return res.status(404).render('pages/404', { title: 'Квест не найден' });
  const task = await Task.findOne({ where: { questId: enrollment.questId, day_number: enrollment.progress_days + 1 } });
  res.render('pages/quest-dashboard', { title: enrollment.Quest.title, enrollment, task: task || { title: 'Отдых', description: 'На сегодня заданий нет.' } });
});

app.post('/quest-checkin/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  const enrollment = await Enrollment.findOne({ where: { id: req.params.id, userId: req.session.user.id }, include: [Quest] });
  if (!enrollment) return res.status(404).send('Enrollment not found');
  const now = new Date();
  const last = enrollment.last_checkin ? new Date(enrollment.last_checkin) : null;
  if (last && last.toDateString() === now.toDateString()) return res.status(400).send('Уже отмечено сегодня');
  enrollment.progress_days += 1;
  enrollment.last_checkin = now;
  if (enrollment.progress_days >= enrollment.Quest.duration_days) {
    enrollment.status = 'completed';
    await Notification.create({ userId: req.session.user.id, title: 'Квест завершен! 🏆', message: `Поздравляем! Вы завершили "${enrollment.Quest.title}".`, type: 'achievement' });
  }
  await enrollment.save();
  const user = await User.findByPk(req.session.user.id);
  user.xp += 15;
  await user.save();
  req.session.user = user;
  res.json({ success: true, progress: enrollment.progress_days, total: enrollment.Quest.duration_days });
});

app.get('/notifications', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  const notifications = await Notification.findAll({ where: { userId: req.session.user.id }, order: [['createdAt', 'DESC']] });
  await Notification.update({ is_read: true }, { where: { userId: req.session.user.id, is_read: false } });
  res.render('pages/notifications', { title: 'Уведомления', notifications });
});

app.get('/leaderboard', async (req, res) => {
  const topUsers = await User.findAll({ limit: 10, order: [['xp', 'DESC']] });
  res.render('pages/leaderboard', { title: 'Зал Славы', topUsers });
});

app.get('/expert/dashboard', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'expert') return res.redirect('/auth');
  const expertQuests = await Quest.findAll({ where: { creator_id: req.session.user.id } });
  const studentCount = await Enrollment.count({ where: { questId: expertQuests.map(q => q.id) } });
  res.render('expert/dashboard', { title: 'Панель Эксперта', stats: { students: studentCount, activeQuests: expertQuests.length, rating: req.session.user.expert_rating || '5.0', income: '128 400 ₽' }, activeQuests: expertQuests });
});

app.get('/expert/quests', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'expert') return res.redirect('/auth');
  const myQuests = await Quest.findAll({ where: { creator_id: req.session.user.id } });
  res.render('expert/quests', { title: 'Управление Квестами', quests: myQuests });
});

app.get('/expert/create-quest', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'expert') return res.redirect('/auth');
  res.render('pages/create-quest', { title: 'Создать квест Актив', mode: 'create', quest: null });
});

app.get('/expert/edit-quest/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'expert') return res.redirect('/auth');
  const quest = await Quest.findOne({ where: { id: req.params.id, creator_id: req.session.user.id }, include: [Task] });
  res.render('pages/create-quest', { title: 'Редактировать квест Актив', mode: 'edit', quest });
});

app.post('/expert/quests/save', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'expert') return res.status(401).send('Unauthorized');
  const { id, title, description, difficulty, reward_xp, duration_days, price, category, tasks } = req.body;
  let quest;
  if (id) {
    quest = await Quest.findByPk(id);
    await quest.update({ title, description, difficulty, reward_xp, duration_days, price, category });
    await Task.destroy({ where: { questId: quest.id } });
  } else {
    quest = await Quest.create({ title, description, difficulty, reward_xp, duration_days, price, category, creator_id: req.session.user.id, creator_type: 'expert' });
  }
  if (tasks && Array.isArray(tasks)) {
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].title) await Task.create({ questId: quest.id, day_number: i + 1, title: tasks[i].title, description: tasks[i].description });
    }
  }
  res.redirect('/expert/quests?success=saved');
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/auth');
  res.render('admin/dashboard', { title: 'Админ-панель' });
});

app.get('/:page', (req, res) => {
  const page = req.params.page;
  res.render(`pages/${page}`, { title: page.charAt(0).toUpperCase() + page.slice(1) }, (err, html) => {
    if (err) res.status(404).render('pages/404', { title: 'Страница не найдена' });
    else res.send(html);
  });
});

sequelize.sync({ alter: true }).then(async () => {
  const [expertUser] = await User.findOrCreate({ where: { email: 'expert@aktiv.app' }, defaults: { name: 'Артем Активный', role: 'expert', password: '123', expert_sphere: 'Активное долголетие', balance: 0, verified: true } });
  const [adminUser] = await User.findOrCreate({ where: { email: 'admin@aktiv.app' }, defaults: { name: 'Актив Админ', role: 'admin', password: 'admin', balance: 0, verified: true } });
  
  const questCount = await Quest.count();
  if (questCount < 3) {
    const detox = await Quest.create({ title: 'Активный детокс', description: 'Полная перезагрузка системы вознаграждения мозга с Актив.', difficulty: 'hard', reward_xp: 1200, duration_days: 14, price: 2500, creator_id: expertUser.id, creator_type: 'expert', category: 'Разум' });
    await Task.create({ questId: detox.id, day_number: 1, title: 'Полный оффлайн', description: '24 часа без интернета.' });
    await Quest.create({ title: 'Ментальный фокус Актив', description: 'Техники глубокой концентрации в системе Актив.', difficulty: 'mid', reward_xp: 800, duration_days: 21, price: 3200, creator_id: expertUser.id, creator_type: 'expert', category: 'Разум' });
    await Quest.create({ title: 'Марафон ранних подъемов', description: '7 дней пробуждения до 6:00. Дисциплина — залог успеха.', difficulty: 'easy', reward_xp: 400, duration_days: 7, price: 0, creator_id: adminUser.id, creator_type: 'user', category: 'Дисциплина' });
    await Quest.create({ title: 'Книжный вызов', description: 'Читайте минимум 30 минут каждый день в течение месяца.', difficulty: 'mid', reward_xp: 1200, duration_days: 30, price: 0, creator_id: adminUser.id, creator_type: 'user', category: 'Развитие' });
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});