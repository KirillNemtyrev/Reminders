const VkBot = require('node-vk-bot-api'); // Основа
const api = require('node-vk-bot-api/lib/api'); // Библиотека для получения имени в ВК
const moment = require('moment'); // Для получения даты
const token = process.env.TOKEN // Токен группы
const bot = new VkBot(token); // Авторизация в вк
const mongoose = require("mongoose"); // Модуль mongoose
const Schema = mongoose.Schema; // Создание схемы
// Подключение к mongoose
mongoose.connect(process.env.URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

// установка схемы
// Схема пользователя
const userScheme = new Schema({
    ID: Number, // ID пользователя
    Flag: Number, // Проверка на flag
    Text: String, // Текст напоминания
    Date: String, // Дата напоминания
    Time: String, // Текст напоминания
    Numbers: Number // Кол-во созданных напоминаний
}); 
const User = mongoose.model("users", userScheme); // сама коллекция с пользователями
// Схема напоминаний
const reminderScheme = new Schema({
    ID: Number, // ID напоминания
    UserID: Number, // ID пользователья
    Text: String, // Текст напоминания
    Date: String, // Дата напоминания
    Time: String, // Текст напоминания
    Repeat: Number, // Повторять ли напоминание
});
const Reminder = mongoose.model("reminders", reminderScheme); // коллекция с напоминаниями

// ============[Регистрация пользователя]===================
async function RegisterUser(userID)
{
    await User.create({ID: userID,
    Flag: 0,
    Text: 'None',
    Date: 'None',
    Time: 'None',
    Numbers: 0})
}
// ============[Регистрация напоминания]===================
async function RegisterReminder(iID, iUserID, sText, sDate, sTime, iRepeat)
{
    await Reminder.create({ID: iID,
        UserID: iUserID,
        Text: sText,
        Date: sDate,
        Time: sTime,
        Repeat: iRepeat})
}
// ============[Команды бота: Начать, Lower=True]===================
bot.command('начать', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
        {
            const data = await api('users.get', {user_ids: ctx.message.from_id,access_token: token}); // Получение имени через модуль
            await ctx.reply(`🤖 [id${ctx.message.from_id}|${data.response[0].first_name}], приветствуем вас!\n\
                                Меня зовут, Ананасыч\n\
                                Я помогаю людям, о чем-либо напомнить\n\
                                Пиши команды! Надеюсь сработаемся)`); // Приветственное сообщение
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя
        } 
        else await ctx.reply('🤖 Хмм.. ты вроде у меня записан. Разве нет?') // Если зареган
    }
});
// ============[Команды бота: Команды, Lower=True]===================
bot.command('команды', async (ctx) => {
    await ctx.reply('🤖 Запоминай данные команды:\n\
    1️⃣ Напомнить - Создать напоминание\n\
    2️⃣ Напоминания - Список моих напоминаний\n\
    3️⃣ Удалить <номер> - Удалить своё напоминание\n\
    4️⃣ Отмена - отменить все действия');
});
// ============[Команды бота: Напомнить, Lower=True]===================
bot.command('напомнить', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя

        await ctx.reply('🤖 Ну хорошо, напиши мне\nО чем тебе нужно напомнить?') 
        await User.findOneAndUpdate({ID: ctx.message.from_id},{ Flag: 1 }).exec(); // Поиск и обновление в базе флага на 1
    }
});
// ============[Команды бота: Напоминания, Lower=True]===================
bot.command('напоминания', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя

        let stringMessage = ''; // Текст для ввывод напоминаний
        let countFind = 0;
        let stringHour, stringMinute;
        const user = await User.findOne({ID: ctx.message.from_id}).exec(); // Создания констаты, поиск пользовтеля
        // Поиск всех напоминаний с пользовательским айди
        for(const reminder of await Reminder.find({UserID: ctx.message.from_id}).exec())
        {
            const splitTime = reminder.Time.split(':'); // Разделение сообщения через :
            if (Number(splitTime[0]) < 10) // Для красоты: Если часов мешньше 10
                stringHour = `0${Number(splitTime[0])}`
            else
                stringHour = `${Number(splitTime[0])}`

            if (Number(splitTime[1]) < 10) // Для красоты: Если минут мешньше 10
                stringMinute = `0${Number(splitTime[1])}`
            else
                stringMinute = `${Number(splitTime[1])}`

            stringMessage+=`#${reminder.ID} | ${reminder.Date} в ${stringHour}:${stringMinute}\n${reminder.Text}`; // Само сообщение
            countFind++; 
        }
        await ctx.reply(`🤖 Созданно напоминаний: ${user.Numbers}\nНайденно напоминаний: ${countFind}\n\n${stringMessage}`); // Сообщение
    }
});
// ============[Команды бота: Удалить, Lower=True]===================
bot.command('удалить', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя
        
        const args = ctx.message.text.split(/ +/g);
        if(!args[1]) // Проверка на существование аргумента
            return await ctx.reply('🤖 Хмм.. ты не ввёл номер напоминания..') // сообщение и прекращение функции 
        const iNumber = Number(args[1]) // Перевод строки в число
        if(await Reminder.findOne({UserID: ctx.message.from_id, ID: iNumber}).exec()) // поиск напоминания
        {
            await Reminder.deleteOne({ID: ctx.message.from_id, ID: iNumber}).exec() // удаление напоминание
            await ctx.reply(`🤖 Напоминание #${iNumber}, было успешно удалено!`) // сообщение
        }
        else await ctx.reply('🤖 Я не смог найти данное напоминание!') // сообщение 
    }
});
// ============[Команды бота: Отмена, Lower=True]===================
bot.command('отмена', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя
        
        const user = await User.findOne({ID: ctx.message.from_id}).exec();
        if (user.Flag > 0) // проверка на то что флаг больше 0
        {
            await User.findOneAndUpdate({ID: ctx.message.from_id},{ Flag: 0, Date: 'None', Time: 'None', Text: 'None' }).exec(); // Обновление аккаунта
            await ctx.reply('🤖 Хорошо, хорошо, я все отменил)'); // Сообщение
        }
        else await ctx.reply('🤖 Хм... А что тебе нужно отменить?'); // Сообщение
    }
});
// ============[Отслеживание всех сообщений]===================
bot.event('message_new', async (ctx) => {
    if (ctx.message.from_id == ctx.message.peer_id) // Проверка на ввода личного сообщения боту
    {
        if (!await User.findOne({ID: ctx.message.from_id}).exec()) // Проверка регистрации
            await RegisterUser(ctx.message.from_id); // Регистрация пользователя
        const user = await User.findOne({ID: ctx.message.from_id}).exec(); // Создания констаты, поиск пользовтеля
        if (user.Flag == 1) // Проверка на флаг = 1
        {
            await ctx.reply(`🤖 Так-с, текст твоего напоминания:\n${ctx.message.text}\n\n\
                                Когда напомнить и во сколько?\n\
                                Формат времени: день.месяц.год час:минуты\n\
                                Пример: 31.12.2020 22:59\n\
                                сегодня 12(запишеться в 12:00)`) 
            await User.findOneAndUpdate({ID: ctx.message.from_id},{ Flag: 2, Text: ctx.message.text }).exec(); // Поиск и обновление в базе пользователя, замена текста и флага
        }
        else if (user.Flag == 2) // Проверка на флаг = 2
        {
            var date = new Date().toLocaleString("en-US", {timeZone: "Europe/Moscow"}); // Переменная для получения даты
            date = new Date(date); // Переменная для получения даты
            let day, month, year, hour, minute, textDate, textTime
            const args = ctx.message.text.split(/ +/g); // Разделение сообщения через split

            const iHour = moment().zone("+03:00"); // Константа: Присваивания часа
            const iMinute = date.getMinutes(); // Константа: Присваивания минут
            const iMonth = date.getMonth() + 1; // Константа: Присваивания сегодняшнего месяца
            const iDay = date.getDate(); // Константа: Присваивания сегодняшнего дня 
            const iYear = date.getFullYear(); // Константа: Присваивания сегодняшнего года

            if (args[0].toLowerCase() == 'сегодня' || args[0].toLowerCase() == 'седня') // Проверка на ввода через через lower
            {
                year = date.getFullYear(); // Присваивания сегодняшнего года
                month = date.getMonth() + 1; // Присваивания сегодняшнего месяца, + 1 т.к вывод мес в js начинается с 0
                day = date.getDate(); // Присваивания сегодняшнего дня
            }
            else if (args[0].toLowerCase() == 'завтра' || args[0].toLowerCase() == 'зт') // Проверка на ввода через через lower
            {
                year = date.getFullYear(); // Присваивания сегодняшнего года
                month = date.getMonth() + 1; // Присваивания сегодняшнего месяца, + 1 т.к вывод мес в js начинается с 0
                day = date.getDate() + 1; // Присваивания завтрашнего дня
                if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12) // Проверка на месяцы
                {
                    if (day > 31) // Больше ли 31 дня?
                    {
                        // если да то:
                        day = 1; // Присваивание первого дня месяца
                        month++; // Присваивание месяца
                        if (month > 12) // Проверка на месяца
                        {
                            month = 1; // Присваивание месяца = января
                            year++; // Добавление к году + 1
                        }
                    }
                }
                else if (month == 4 || month == 6 || month == 9 || month == 11) // Проверка на месяцы
                {
                    if (day > 30) // Больше ли 30 дня?
                    {
                        // если да то:
                        day = 1; // Присваивание первого дня месяца
                        month++; // Присваивание месяца
                        if (month > 12) // Проверка на месяца
                        {
                            month = 1; // Присваивание месяца = января
                            year++; // Добавление к году + 1
                        }
                    }
                }
                else
                {
                    if(year % 4 == 0 && ( year % 100 != 0 || year % 400 == 0 )) // Проверка на високосный год
                    {
                        if (day > 29) // Проверка: Больше ли 29 дней, если да, то:
                        {
                            day = 1; // Присваивание первого дня месяца
                            month++; // Присваивание месяца
                        }
                    }
                    else // Если не високосный год
                    {
                        if (day > 28) // Проверка: Больше ли 28 дней, если да, то:
                        {
                            day = 1; // Присваивание первого дня месяца
                            month++; // Присваивание месяца
                        }
                    }
                }
            }
            else // Проверка на ввод даты в ручную
            {
                const splitDate = args[0].split('.');
                if (!splitDate[1]) // Проверка на существование данного аргумента
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл месяц, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if (!splitDate[2]) // Проверка на существование данного аргумента
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл год, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if(Number(splitDate[0]) < 1 || Number(splitDate[0]) > 31)
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл день, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if(Number(splitDate[1]) < 1 || Number(splitDate[1]) > 12)
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл месяц, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if(Number(splitDate[2]) < iYear || Number(splitDate[2]) > iYear + 2)
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл день, попробуй еще раз!') // Ответное сообщение и прекращение функции

                // Проверка на ввод даты
                if((Number(splitDate[1]) == 1 || Number(splitDate[1]) == 3 || Number(splitDate[1]) == 5 || Number(splitDate[1]) == 7 || Number(splitDate[1]) == 8 || Number(splitDate[1]) == 10 || Number(splitDate[1]) == 12) && (Number(splitDate[0]) > 31 || Number(splitDate[0]) < 1))
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                            Не может быть в таком месяце больше 31 или меньше 1 дня') // Ответное сообщение и прекращение функции   

                if(((Number(splitDate[1]) == 4 || Number(splitDate[1]) == 6 || Number(splitDate[1]) == 9 || Number(splitDate[1]) == 11)) && (Number(splitDate[0]) > 30 || Number(splitDate[0]) < 1))
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                            Не может быть в таком месяце больше 30 или меньше 1 дня') // Ответное сообщение и прекращение функции 

                // Проверка: прошлое
                if (iYear > Number(splitDate[2])) // Проверка прошедшее время
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                 Я не могу работать в прошлом, год ввел неправильно') // Ответное сообщение и прекращение функции 
                else if(iYear == Number(splitDate[2]) && iMonth > Number(splitDate[1])) // Проверка прошедшее время
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                 Я не могу работать в прошлом, месяц ввел неправильно') // Ответное сообщение и прекращение функции 
                else if(iYear == Number(splitDate[2]) && iMonth == Number(splitDate[1]) && iDay > Number(splitDate[1])) // Проверка прошедшее время
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                             Я не могу работать в прошлом, день ввел неправильно') // Ответное сообщение и прекращение функции 
                else // Если проблем не обнаружено, то
                {
                    year = Number(splitDate[2]); // Присваивания введенного года
                    month = Number(splitDate[1]); // Присваивания введенного месяца
                    day = Number(splitDate[0]); // Присваивания введенного дня
                }
            }
            textDate = `${day}.${month}.${year}`; // Нужно для записи в базу данных
            if(!args[1]) // Проверка на ввод времени
                return await ctx.reply('🤖 Я не ванга, я незнаю во сколько тебе нужно напомнить\nПопробуй еще раз..')
            // Проверка на ввод аргумента без указания минут
            if(Number(args[1]) >= 0 && Number(args[1]) <= 23) // Number(аргумент) -> перевод в число
            {
                hour = Number(args[1]); // Присвоение часа
                minute = 0; // Присвоение минут
            }
            else
            {
                const splitTime = args[1].split(':'); // Разделение сообщения через :
                const splitDate = user.Date.split('.');
                if (Number(splitTime[0]) < 0 || Number(splitTime[0]) > 23)
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл часы, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if (Number(splitTime[1]) < 0 || Number(splitTime[1]) > 60)
                    return await ctx.reply('🤖 Упс.. видимо ты не так ввёл минуты, попробуй еще раз!') // Ответное сообщение и прекращение функции

                if(Number(iYear) == Number(splitDate[2]) && Number(iMonth) == Number(splitDate[1]) && Number(iDay)== Number(splitDate[1]) && Number(iHour) > Number(splitTime[0])) // Проверка прошедшее время
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                                Я не могу работать в прошлом, час ввел неправильно') // Ответное сообщение и прекращение функции 
                else if(Number(iYear) == Number(splitDate[2]) && Number(iMonth) == Number(splitDate[1]) && Number(iDay) == Number(splitDate[1]) && Number(iHour) == Number(splitTime[0]) && iMinute > Number(splitTime[1])) // Проверка прошедшее время
                    return await ctx.reply('🤖 Хм.. у тебя тут ошибка:\n\
                                            Я не могу работать в прошлом, минуты ввел неправильно') // Ответное сообщение и прекращение функции 
                else // Если проблем не обнаружено, то
                {
                    hour = Number(splitTime[0]); // Присваивание часа
                    minute = Number(splitTime[1]); // Присваивание минут
                }
            }
            textTime = `${hour}:${minute}`; // Нужно для записи в базу данных
            // Поиск и обновление данных пользователя
            await User.findOneAndUpdate({ID: ctx.message.from_id},{ Flag: 3, Date: textDate, Time: textTime }).exec(); 
            await ctx.reply('🤖 И так, мне каждый день повторять это напоминание?\nДа или Нет?'); // Ответное сообщение
        }
        else if(user.Flag == 3)
        {
            let iRepeat = 0, messageRepeat, stringHour, stringMinute;
            if(ctx.message.text.toLowerCase() == 'да') iRepeat = 1; // повторять каждый день
            else if(ctx.message.text.toLowerCase() == 'нет') iRepeat = 0; // не повторять
            else return await ctx.reply('🤖 Хмм.. это не ответ\nМне нужно знать, повторять тебе или нет?\nДа или Нет?') // В случае левого сообщения
            await RegisterReminder(user.Numbers + 1, ctx.message.from_id, user.Text, user.Date, user.Time, iRepeat); // Создание напоминания
            // Обнуление аккаунта
            await User.findOneAndUpdate({ID: ctx.message.from_id},{ Flag: 0, Date: 'None', Time: 'None', Text: 'None', Numbers: user.Number + 1 }).exec(); 
            if (iRepeat == 1) messageRepeat = 'Да'; // Проверка: если с повторением, сообщение = да
            else messageRepeat = 'Нет'; // Проверка: если без повторения, сообщение = нет
            const splitTime = user.Time.split(':'); // split через :
            if (Number(splitTime[0]) < 10) // Для красоты: Если часов мешньше 10
                stringHour = `0${Number(splitTime[0])}`
            else
                stringHour = `${Number(splitTime[0])}`

            if (Number(splitTime[1]) < 10) // Для красоты: Если минут мешньше 10
                stringMinute = `0${Number(splitTime[1])}`
            else
                stringMinute = `${Number(splitTime[1])}`
            await ctx.reply(`🤖 Напоминание #${user.Numbers + 1}, успешно созданно\n\
                    Дата: ${user.Date}\n\
                    Время: ${stringHour}:${stringMinute}\n\
                    Текст: ${user.Text}\n\
                    С повторением: ${messageRepeat}`)
        }
        else // Если сообщение пришло просто так
            await ctx.reply('🤖 Хм.. я к сожалению тебя не понял\n\
                            Введи: "Команды", чтобы узнать мой функционал!') // Ответное сообщение
    }
});

async function SendReminderMessage()
{
    var date = new Date().toLocaleString("en-US", {timeZone: "Europe/Moscow"}); // Переменная для получения даты
    date = new Date(date); // Переменная для получения даты
    const iHour = date.getHours(); // Константа: Присваивания часа
    const iMinute = date.getMinutes(); // Константа: Присваивания минут
    const iMonth = date.getMonth() + 1; // Константа: Присваивания сегодняшнего месяца
    const iDay = date.getDate(); // Константа: Присваивания сегодняшнего дня 
    const iYear = date.getFullYear(); // Константа: Присваивания сегодняшнего года

    let stringTime = `${iHour}:${iMinute}`; // Время в строке
    let stringDate = `${iDay}.${iMonth}.${iYear}` // Дата в строке

    // Цикл для отправки сообщения
    for(const reminder of await Reminder.find({Time: stringTime, Date: stringDate}).exec())
    {
        let messageRepeat = '';
        if (reminder.Repeat == 1) // проверка на повторение
        {
            const args = reminder.Date.split('.'); // Разделение даты через точку
            let oDay = Number(args[0]); // Присваивание дня
            let oMonth = Number(args[1]); // Присваивание месяца
            let oYear = Number(args[2]); // Присваивание года

            oDay++; // Прибавление ко дню + 1
            
            // Проверка на месяц
            if((oMonth == 1 || oMonth == 3 || oMonth == 5 || oMonth == 7 || oMonth == 8 || oMonth == 10 || oMonth == 12) && oDay > 31)
            {
                oMonth++; // Прибавление месяца
                oDay = 1; // Сет на первый день
                if(oMonth > 12) oMonth = 1; // Сет на январь
            }
            else if(((oMonth== 4 || oMonth == 6 || oMonth == 9 || oMonth == 11)) && oDay > 30)
            {
                oMonth++; // Прибавление месяца
                oDay = 1; // Сет на первый день
            }
            else 
            {
                if(oYear % 4 == 0 && ( oYear % 100 != 0 || oYear % 400 == 0 )) // Проверка на високосный год
                {
                        if (oDay > 29) // Проверка: Больше ли 29 дней, если да, то:
                        {
                            oDay = 1; // Присваивание первого дня месяца
                            oMonth++; // Присваивание месяца
                        }
                }
                else // Если не високосный год
                {
                    if (oDay > 28) // Проверка: Больше ли 28 дней, если да, то:
                    {
                        oDay = 1; // Присваивание первого дня месяца
                        oMonth++; // Присваивание месяца
                    }
                }
            }
            // Обновление
            await Reminder.findOneAndUpdate({UserID: reminder.UserID, ID: reminder.ID},{ Date: `${oDay}.${oMonth}.${oYear}`}).exec(); 
            messageRepeat = `Напоминание перенесенно на ${oDay}.${oMonth}.${oYear}`;
        }
        else await Reminder.deleteOne({UserID: reminder.UserID, ID: reminder.ID}).exec() // удаление напоминание
        const data = await api('users.get', {user_ids: ctx.message.from_id,access_token: token}); // Получение имени через модуль
        await bot.sendMessage(reminder.UserID, `[id${ctx.message.from_id}|${data.response[0].first_name}], Напоминание #${reminder.ID}\n${reminder.Text}\n\n${messageRepeat}`); // Отправка сообщения
    }
}

// ===============[Запуск бота]==============
bot.startPolling(); 
// ===============[Запуск интервала проверки напоминания]==============
//setInterval(SendReminderMessage, 30000)
console.log(moment().zone("+03:00"));