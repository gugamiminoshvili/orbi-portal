// The company's process rules, transcribed from the four print posters in
// orbi-instructions/posters/*.html. Those files are page-sized artefacts (a
// 1080px poster with its own dark header, logo and language pills); the
// wording here is theirs verbatim, only the presentation is rebuilt in the
// portal's own visual language by GuidePage.
//
// Content lives here rather than in src/i18n/locales/*.json on purpose: these
// are long prose documents, not UI chrome, and dropping ~200 sentences into
// the locale files would bury the interface strings. `useGuideText` (see
// GuidePage) picks the field for the active i18next language, so the global
// language menu still drives them - the posters' own ქარ/ENG/РУС pills are
// gone.
//
// `**bold**` in any string marks emphasis (the posters used <strong>); the
// RichText renderer in GuidePage turns it into <strong> without ever handing
// raw HTML to dangerouslySetInnerHTML.
//
// Block types a section may carry: `text`, `list`, `pairs`, `steps`, `split`,
// `footnote`. A guide may additionally carry `stats`, `note` and `banner`.

export const GUIDES = [
  {
    slug: 'handover',
    columns: 3,
    navKey: 'guideHandover',
    icon: 'building',
    category: {
      ka: 'გაქირავების დეპარტამენტი',
      en: 'Rental Department',
      ru: 'Департамент аренды',
    },
    title: {
      ka: 'აპარტამენტების გადმობარება',
      en: 'Apartment handover',
      ru: 'Управление апартаментов',
    },
    intro: {
      ka: 'აპარტამენტების მართვის სრული ციკლი - სასტუმრო სტანდარტებით მომზადება, გაქირავება, ფინანსური აღრიცხვა და მესაკუთრის სრული მხარდაჭერა.',
      en: 'A full-cycle apartment management service - preparation to hotel standards, rental, financial accounting, and complete owner support.',
      ru: 'Полный цикл управления апартаментами - подготовка под гостиничный стандарт, аренда, финансовый учёт и полная поддержка собственника.',
    },
    sections: [
      {
        icon: 'home',
        title: { ka: 'სასტუმრო სტანდარტი', en: 'Hotel standard', ru: 'Гостиничный стандарт' },
        text: {
          ka: 'ბინა უნდა იყოს თავისუფალი პირადი ნივთებისგან და სრულად აღჭურვილი ტექნიკით, ავეჯით, ტექსტილითა და ჭურჭლით.',
          en: 'The apartment must be free of personal belongings and fully equipped with appliances, furniture, textiles, and kitchenware.',
          ru: 'Апартамент должен быть освобождён от личных вещей и полностью укомплектован техникой, мебелью, текстилем и посудой.',
        },
      },
      {
        icon: 'check',
        title: { ka: 'შემოწმება', en: 'Inspection', ru: 'Проверка' },
        text: {
          ka: 'მართვაში მიღებამდე მოწმდება ბინის ტექნიკური მდგომარეობა და ინვენტარი.',
          en: 'Before acceptance into management, the apartment’s technical condition and inventory are inspected.',
          ru: 'Перед передачей в управление проводится проверка технического состояния и инвентаря.',
        },
      },
      {
        icon: 'card',
        title: { ka: 'დაკომპლექტების სერვისი', en: 'Furnishing service', ru: 'Услуга комплектации' },
        text: {
          ka: 'თუ ბინა ვერ აკმაყოფილებს სტანდარტს - სრული დაკომპლექტება მესაკუთრის მიერ ინვოისის დადასტურებისა და ანაზღაურების საფუძველზე.',
          en: 'If the apartment does not meet the standard, a complete furnishing service is offered based on the owner’s approval and payment of the issued invoice.',
          ru: 'Если апартамент не соответствует стандарту, компания предоставляет полную услугу комплектации после подтверждения и оплаты счёта собственником.',
        },
      },
      {
        icon: 'swap',
        wide: true,
        title: { ka: 'ფინანსური განაწილება', en: 'Financial distribution', ru: 'Распределение дохода' },
        split: {
          ownerPct: 91,
          owner: { ka: '91% - მესაკუთრე', en: '91% - Owner', ru: '91% - Собственник' },
          legend: [
            {
              ka: '91% ეკუთვნის მესაკუთრეს',
              en: '91% belongs to the owner',
              ru: '91% получает собственник',
            },
            {
              ka: '9% კომპანიის საკომისიო',
              en: '9% is the company’s commission',
              ru: '9% - комиссия компании',
            },
          ],
        },
        pairs: [
          {
            label: {
              ka: 'გამოქვითვები მესაკუთრის წილიდან',
              en: 'Deductions from the owner’s share',
              ru: 'Удержания из доли собственника',
            },
            value: {
              ka: '5% საშემოსავლო გადასახადი + კომუნალური და მიმდინარე მომსახურების ხარჯები',
              en: '5% income tax + utility and current maintenance costs',
              ru: '5% подоходного налога + коммунальные и текущие расходы на обслуживание',
            },
          },
          {
            label: {
              ka: 'დამატებითი სერვისები',
              en: 'Additional services',
              ru: 'Дополнительные услуги',
            },
            value: {
              ka: 'სტუმრისთვის გაწეული ფასიანი სერვისების შემოსავალი სრულად ეკუთვნის ოპერატორს',
              en: 'Income from paid guest services belongs entirely to the operator',
              ru: 'Доход от платных услуг гостям полностью принадлежит оператору',
            },
          },
        ],
        footnote: {
          ka: 'დარიცხვა ხდება მხოლოდ ფაქტობრივი გაქირავების დღეების მიხედვით; შემოსავალი დამოკიდებულია სეზონურობასა და დატვირთულობაზე.',
          en: 'Revenue is calculated only for actual rental days; income depends on seasonality and occupancy.',
          ru: 'Доход начисляется только за фактические дни аренды; зависит от сезона и уровня загрузки.',
        },
      },
      {
        icon: 'cal',
        wide: true,
        title: { ka: 'ანგარიშსწორება', en: 'Settlement', ru: 'Расчёты' },
        text: {
          ka: 'ყოველთვიურად, თვის **15-დან 25 რიცხვამდე**. მესაკუთრეს მიეწოდება დეტალური ფინანსური ანგარიში - გაქირავების დღეები, შემოსავალი და გამოქვითვები.',
          en: 'Monthly, **between the 15th and 25th**. The owner receives a detailed financial report - rental days, income, and deductions.',
          ru: 'Ежемесячно, **с 15 по 25 число**. Собственник получает подробный финансовый отчёт - дни аренды, доход и удержания.',
        },
      },
      {
        icon: 'doc',
        wide: true,
        title: {
          ka: 'მიღება-ჩაბარება და პასუხისმგებლობა',
          en: 'Acceptance and responsibilities',
          ru: 'Приём-передача и ответственность',
        },
        pairs: [
          {
            label: {
              ka: 'მიღება-ჩაბარების აქტი',
              en: 'Acceptance certificate',
              ru: 'Акт приёма-передачи',
            },
            value: {
              ka: 'ფორმდება 3 წლის ვადით; მოიცავს ქონების (ტექნიკა, ავეჯი, ინვენტარი) დეტალურ აღწერას',
              en: 'Signed for a three-year period; includes a detailed inventory of the property (appliances, furniture, equipment)',
              ru: 'Оформляется сроком на три года; содержит подробное описание имущества (техника, мебель, инвентарь)',
            },
          },
          {
            label: {
              ka: 'კომპანიის პასუხისმგებლობა',
              en: 'Company responsibility',
              ru: 'Ответственность компании',
            },
            value: {
              ka: 'სრულად აგებს პასუხს სტუმრის მიერ ქონების დაზიანებაზე',
              en: 'Fully responsible for damage to the property caused by guests',
              ru: 'Полностью несёт ответственность за ущерб имуществу, причинённый гостями',
            },
          },
          {
            wide: true,
            label: { ka: 'გამონაკლისები', en: 'Exceptions', ru: 'Исключения' },
            value: {
              ka: 'არ ანაზღაურდება ნივთების ბუნებრივი ცვეთა და ტექსტილის/ჭურჭლის დაზიანება-დაკარგვა',
              en: 'Normal wear and tear or damage/loss of textiles and kitchenware are not compensated',
              ru: 'Не компенсируются естественный износ и повреждение/утрата текстиля и посуды',
            },
          },
        ],
      },
      {
        icon: 'arrow',
        wide: true,
        title: {
          ka: 'როგორ დავიწყოთ თანამშრომლობა',
          en: 'How to get started',
          ru: 'Как начать сотрудничество',
        },
        steps: [
          {
            title: { ka: 'განაცხადი', en: 'Application', ru: 'Заявка' },
            text: {
              ka: 'გაეცანით პირობებს და გააგზავნეთ განაცხადი პირადი კაბინეტიდან.',
              en: 'Review the terms and submit your application via your Personal Cabinet.',
              ru: 'Ознакомьтесь с условиями и отправьте заявку через Личный кабинет.',
            },
          },
          {
            title: { ka: 'კონსულტაცია', en: 'Consultation', ru: 'Консультация' },
            text: {
              ka: 'გაიარეთ კონსულტაცია ჩვენს მენეჯერთან.',
              en: 'Consult with one of our managers.',
              ru: 'Получите консультацию у нашего менеджера.',
            },
          },
          {
            title: { ka: 'შემოწმება', en: 'Inspection', ru: 'Проверка' },
            text: {
              ka: 'ბინის შემოწმება, საჭიროებისამებრ - დაკომპლექტება.',
              en: 'Apartment inspection, and furnishing if required.',
              ru: 'Проверка апартамента и, при необходимости, комплектация.',
            },
          },
          {
            title: { ka: 'გადაცემა', en: 'Handover', ru: 'Передача' },
            text: {
              ka: 'დოკუმენტაციის გაფორმება და ბინის გადაცემა მართვაში.',
              en: 'Sign the documentation and hand over the apartment for management.',
              ru: 'Подпишите документы и передайте апартамент в управление.',
            },
          },
        ],
      },
    ],
    footer: {
      ka: 'პროფესიონალური მართვა • გამჭვირვალე ფინანსები • სრული მხარდაჭერა',
      en: 'Professional management • Transparent finances • Full support',
      ru: 'Профессиональное управление • Прозрачные финансы • Полная поддержка',
    },
  },

  {
    slug: 'power-of-attorney',
    columns: 2,
    navKey: 'guidePowerOfAttorney',
    icon: 'doc',
    category: {
      ka: 'სამართლებრივი ინსტრუქცია',
      en: 'Legal information',
      ru: 'Правовая информация',
    },
    title: { ka: 'მინდობილობა', en: 'Power of Attorney', ru: 'Доверенность' },
    intro: {
      ka: 'ყველაფერი, რაც უნდა იცოდეთ მინდობილობის გაფორმებამდე და აპარტამენტის მართვაში წარდგენამდე.',
      en: 'Everything you need to know before issuing a Power of Attorney.',
      ru: 'Всё, что необходимо знать перед оформлением доверенности.',
    },
    sections: [
      {
        icon: 'home',
        title: {
          ka: 'საქართველოში გაფორმებული',
          en: 'Issued in Georgia',
          ru: 'Оформленная в Грузии',
        },
        text: {
          ka: 'ნოტარიულად დამოწმება **სავალდებულოა**.',
          en: 'Notarization is **mandatory**.',
          ru: 'Нотариальное удостоверение **обязательно**.',
        },
      },
      {
        icon: 'share',
        title: {
          ka: 'საზღვარგარეთ გაფორმებული',
          en: 'Issued abroad',
          ru: 'Оформленная за границей',
        },
        list: [
          { ka: 'ნოტარიულად დამოწმებული', en: 'Notarized', ru: 'Нотариально удостоверена' },
          {
            ka: 'ნოტარიულად დამოწმებული',
            en: 'Notarized',
            ru: 'Нотариально удостоверена',
            tag: '+ Apostille',
          },
          { ka: 'ლეგალიზებული', en: 'Legalized', ru: 'Легализована' },
        ],
      },
      {
        icon: 'doc',
        wide: true,
        title: {
          ka: 'მინდობილობაში აუცილებლად უნდა იყოს',
          en: 'The Power of Attorney must include',
          ru: 'В доверенности обязательно должны быть указаны',
        },
        pairs: [
          {
            label: {
              ka: 'მესაკუთრის ინფორმაცია',
              en: 'Property owner details',
              ru: 'Полные данные собственника',
            },
            value: {
              ka: 'სახელი, გვარი, დაბადების თარიღი, პირადი/პასპორტის ნომერი',
              en: 'Full name, date of birth, ID/passport number',
              ru: 'ФИО, дата рождения, номер паспорта/удостоверения',
            },
          },
          {
            label: {
              ka: 'მინდობილი პირის ინფორმაცია',
              en: 'Authorized representative details',
              ru: 'Полные данные доверенного лица',
            },
            value: {
              ka: 'სახელი, გვარი, დაბადების თარიღი, პირადი/პასპორტის ნომერი',
              en: 'Full name, date of birth, ID/passport number',
              ru: 'ФИО, дата рождения, номер паспорта/удостоверения',
            },
          },
          {
            label: {
              ka: 'უძრავი ქონების მონაცემები',
              en: 'Property information',
              ru: 'Данные объекта недвижимости',
            },
            value: {
              ka: 'ბლოკი, ბინის ნომერი, საკადასტრო კოდი (საჭიროებისამებრ)',
              en: 'Block, apartment number, cadastral code (if applicable)',
              ru: 'Блок, номер квартиры, кадастровый код (при необходимости)',
            },
          },
          {
            label: { ka: 'მოქმედების ვადა', en: 'Validity period', ru: 'Срок действия' },
            value: {
              ka: 'დაწყებისა და დასრულების თარიღი',
              en: 'Effective and expiration dates',
              ru: 'Даты начала и окончания',
            },
          },
        ],
      },
      {
        icon: 'tag',
        title: {
          ka: 'უცხო ენაზე შედგენილი',
          en: 'Drafted in a foreign language',
          ru: 'На иностранном языке',
        },
        list: [
          {
            ka: 'ქართულად თარგმანი აუცილებელია',
            en: 'Must be translated into Georgian',
            ru: 'Обязателен перевод на грузинский язык',
          },
          {
            ka: 'თარგმანი ნოტარიულად დამოწმებული',
            en: 'The translation must be notarized',
            ru: 'Перевод должен быть нотариально удостоверен',
          },
          {
            ka: 'ორიგინალი და თარგმანი უნდა ემთხვეოდეს',
            en: 'The original and translation must fully correspond',
            ru: 'Оригинал и перевод должны полностью соответствовать',
          },
        ],
      },
      {
        icon: 'clip',
        title: {
          ka: 'წარმოსადგენი დოკუმენტი',
          en: 'Submitted document',
          ru: 'Представляемый документ',
        },
        text: {
          ka: 'ორიგინალი **ან** ნოტარიულად დამოწმებული ასლი.',
          en: 'Original **or** a notarized copy.',
          ru: 'Оригинал **или** нотариально заверенная копия.',
        },
      },
      {
        icon: 'help',
        wide: true,
        title: {
          ka: 'დამატებითი ინფორმაცია',
          en: 'Additional information',
          ru: 'Дополнительная информация',
        },
        pairs: [
          {
            label: { ka: 'გადანდობის უფლება', en: 'Right of substitution', ru: 'Право передоверия' },
            value: {
              ka: 'მინდობილს შეუძლია უფლებამოსილება სხვას გადაანდოს',
              en: 'The representative may delegate authority to another person',
              ru: 'Доверенное лицо вправе передать полномочия другому лицу',
            },
          },
          {
            label: { ka: 'გაქირავების უფლება', en: 'Right to lease', ru: 'Право сдачи в аренду' },
            value: {
              ka: 'მინდობილს შეუძლია გააფორმოს შესაბამისი ხელშეკრულება',
              en: 'The representative may conclude the lease agreement',
              ru: 'Доверенное лицо вправе заключить договор аренды',
            },
          },
          {
            label: { ka: 'რამდენიმე მესაკუთრე', en: 'Multiple owners', ru: 'Несколько собственников' },
            value: {
              ka: 'საჭიროა ყველა მესაკუთრის თანხმობა',
              en: 'The consent of all owners is required',
              ru: 'Требуется согласие всех собственников',
            },
          },
          {
            label: {
              ka: 'არასრულწლოვანი მესაკუთრე',
              en: 'Minor owner',
              ru: 'Несовершеннолетний собственник',
            },
            value: {
              ka: 'მინდობილობას აფორმებს კანონიერი წარმომადგენელი',
              en: 'Issued by the legal representative',
              ru: 'Доверенность оформляет законный представитель',
            },
          },
          {
            wide: true,
            label: { ka: 'რეგისტრირებული ქონება', en: 'Registered property', ru: 'Зарегистрированное имущество' },
            value: {
              ka: 'მხოლოდ იმ ქონებაზე, რომელიც საჯარო რეესტრში მესაკუთრის სახელზეა რეგისტრირებული',
              en: 'Only for property registered in the owner’s name with the Public Registry',
              ru: 'Только на имущество, зарегистрированное на имя собственника в Публичном реестре',
            },
          },
        ],
      },
    ],
    note: {
      ka: '**შენიშვნა:** საზღვარგარეთ გაფორმებული მინდობილობის მოთხოვნები დამოკიდებულია ქვეყანაზე.',
      en: '**Note:** Requirements depend on the country where the document is issued.',
      ru: '**Примечание:** Требования зависят от страны оформления документа.',
    },
    footer: {
      ka: 'კითხვის შემთხვევაში - Contact Centre 24/7',
      en: 'Questions? - Contact Centre 24/7',
      ru: 'Есть вопросы? - Contact Centre 24/7',
    },
  },

  {
    slug: 'service',
    columns: 2,
    navKey: 'guideService',
    icon: 'wrench',
    category: {
      ka: 'საერთო ქონების მოვლა',
      en: 'Common property maintenance',
      ru: 'Обслуживание общего имущества',
    },
    title: { ka: 'სერვისი', en: 'Service', ru: 'Обслуживание' },
    intro: {
      ka: 'საერთო სარგებლობაში არსებული ქონების მოვლა - კომპლექსის გამართული მუშაობის უზრუნველყოფა 24/7. ეს ხარჯები შედის მომსახურების გადასახადში.',
      en: 'Maintenance of common property - ensuring the smooth operation of the complex 24/7. These costs are included in the service fee.',
      ru: 'Обслуживание общего имущества - обеспечение бесперебойной работы комплекса 24/7. Эти расходы входят в плату за обслуживание.',
    },
    stats: [
      {
        value: '24/7',
        label: {
          ka: 'უწყვეტი მუშაობა და მონიტორინგი',
          en: 'Continuous operation and monitoring',
          ru: 'Бесперебойная работа и мониторинг',
        },
      },
      {
        value: '3500+',
        label: {
          ka: 'დამონტაჟებული კამერა',
          en: 'Surveillance cameras',
          ru: 'Камер видеонаблюдения',
        },
      },
      {
        value: '150+',
        label: { ka: 'დაცვის თანამშრომელი', en: 'Security officers', ru: 'Сотрудников охраны' },
      },
      {
        value: '150+',
        label: {
          ka: 'მეხანძრე ინსპექტორი',
          en: 'Fire inspectors',
          ru: 'Специалистов пожарной безопасности',
        },
      },
    ],
    sections: [
      {
        icon: 'building',
        title: {
          ka: 'საერთო სივრცის მოვლა',
          en: 'Common area maintenance',
          ru: 'Обслуживание общих зон',
        },
        list: [
          {
            ka: 'დერეფნებისა და საერთო სივრცეების დასუფთავება',
            en: 'Cleaning of corridors and common areas',
            ru: 'Уборка коридоров и мест общего пользования',
          },
          {
            ka: 'განათება და ტექნიკური უზრუნველყოფა',
            en: 'Lighting and technical maintenance',
            ru: 'Освещение и техническое содержание',
          },
          {
            ka: 'უსაფრთხოების უზრუნველყოფა',
            en: 'Ensuring security',
            ru: 'Обеспечение безопасности',
          },
        ],
      },
      {
        icon: 'swap',
        title: {
          ka: 'ლიფტების 24-საათიანი მუშაობა',
          en: '24/7 elevator operation',
          ru: 'Круглосуточная работа лифтов',
        },
        text: {
          ka: 'გამართულ მუშაობას უზრუნველყოფს მაღალი კლასის სისტემა და ტექნიკური უზრუნველყოფის 24-საათიანი გუნდი.',
          en: 'Supported by a high-class system and a round-the-clock technical maintenance team.',
          ru: 'Обеспечивается современными инженерными системами и круглосуточной технической поддержкой.',
        },
      },
      {
        icon: 'eye',
        title: { ka: 'დაცვა და მონიტორინგი', en: 'Security and monitoring', ru: 'Охрана и мониторинг' },
        text: {
          ka: '24/7 რეჟიმში უზრუნველყოფს უსაფრთხოებასა და სიმშვიდეს მთელ კომპლექსში - **3500+ კამერა** და **150+ დაცვის თანამშრომელი**.',
          en: 'Operating 24/7 to ensure safety and peace throughout the complex - **3,500+ cameras** and **150+ security officers**.',
          ru: 'Круглосуточно обеспечивает безопасность на всей территории комплекса - **3500+ камер** и **150+ сотрудников охраны**.',
        },
      },
      {
        icon: 'warn',
        title: { ka: 'სახანძრო უსაფრთხოება', en: 'Fire safety', ru: 'Пожарная безопасность' },
        text: {
          ka: 'მსოფლიოში უმაღლესი დონის სისტემა და **150+ მეხანძრე ინსპექტორი**. ყველა დერეფანი და აპარტამენტი აღჭურვილია მულტისენსორული, კვამლის და თერმო დეტექტორებით და ხმოვანი სიგნალის სისტემით.',
          en: 'A world-class fire safety system maintained by **150+ qualified inspectors**. All corridors and apartments have multi-sensor, smoke, and heat detectors and an audible alarm system.',
          ru: 'Современная система пожарной безопасности и **150+ квалифицированных специалистов**. Все коридоры и апартаменты оснащены мультисенсорными, дымовыми и тепловыми датчиками и системой звукового оповещения.',
        },
      },
      {
        icon: 'bolt',
        title: {
          ka: 'რესურსების უწყვეტი მომარაგება',
          en: 'Uninterrupted resource supply',
          ru: 'Бесперебойное снабжение ресурсами',
        },
        text: {
          ka: 'დიზელ გენერატორები და წყლის ტუმბოები უზრუნველყოფენ ობიექტზე უწყვეტ ელექტროენერგიისა და წყლის მომარაგებას.',
          en: 'Diesel generators and water pumps ensure uninterrupted electricity and water supply throughout the property.',
          ru: 'Дизельные генераторы и насосные станции обеспечивают бесперебойное электроснабжение и подачу воды.',
        },
      },
      {
        icon: 'help',
        title: { ka: '24/7 მხარდაჭერა', en: '24/7 support', ru: 'Поддержка 24/7' },
        text: {
          ka: 'Reception და Contact Centre მუშაობს 24/7 რეჟიმში - მუდმივი კომუნიკაცია და დახმარება.',
          en: 'Reception and Contact Centre operate 24/7 - constant communication and assistance.',
          ru: 'Reception и Contact Centre работают 24/7 - постоянная связь и помощь.',
        },
      },
    ],
    footer: {
      ka: 'უსაფრთხო და კომფორტული გარემო - 24/7',
      en: 'A safe and comfortable environment - 24/7',
      ru: 'Безопасная и комфортная среда - 24/7',
    },
  },

  {
    slug: 'contact-centre',
    columns: 2,
    navKey: 'guideContactCentre',
    icon: 'chat',
    category: {
      ka: 'ცენტრალიზებული მხარდაჭერა',
      en: 'Centralized support',
      ru: 'Централизованная поддержка',
    },
    title: { ka: 'Contact Centre', en: 'Contact Centre', ru: 'Contact Centre' },
    intro: {
      ka: 'ჩვენ აქ ვართ მხარდასაჭერად. ცენტრალიზებული საკონტაქტო ცენტრი უზრუნველყოფს სწრაფ, ეფექტურ და მარტივ კომუნიკაციას - ერთიან სივრცეს ინფორმაციის, მოთხოვნისა და დახმარებისთვის.',
      en: 'We are here to support you. A centralized Contact Centre provides fast, efficient, and seamless communication - a unified hub for information, requests, and assistance.',
      ru: 'Мы здесь, чтобы помочь. Централизованный Contact Centre обеспечивает быстрое, эффективное и удобное взаимодействие - единое пространство для информации, обращений и помощи.',
    },
    sections: [
      {
        icon: 'help',
        title: { ka: 'რატომ შეიქმნა', en: 'Why it was created', ru: 'Почему создан' },
        list: [
          {
            ka: 'მოთხოვნების სწრაფი მიღება და დამუშავება',
            en: 'Receive and process requests quickly',
            ru: 'Быстро принимать и обрабатывать обращения',
          },
          {
            ka: 'კომუნიკაციის პროცესის გამარტივება',
            en: 'Simplify communication processes',
            ru: 'Упрощать процесс коммуникации',
          },
          {
            ka: 'დეპარტამენტებთან კოორდინაციის გაუმჯობესება',
            en: 'Improve coordination between departments',
            ru: 'Улучшать координацию между подразделениями',
          },
          {
            ka: 'მომსახურების ხარისხის ამაღლება',
            en: 'Enhance service quality',
            ru: 'Повышать качество обслуживания',
          },
          {
            ka: 'დროული უკუკავშირის მიწოდება',
            en: 'Provide timely feedback',
            ru: 'Обеспечивать своевременную обратную связь',
          },
        ],
      },
      {
        icon: 'chat',
        title: { ka: 'რას გთავაზობთ', en: 'What it offers', ru: 'Что предлагает' },
        list: [
          {
            ka: 'ინფორმაცია კომპანიის სერვისებზე',
            en: 'Information about the company’s services',
            ru: 'Информацию об услугах компании',
          },
          {
            ka: 'კითხვის, მოთხოვნის ან საჭიროების დაფიქსირება',
            en: 'Submit questions, requests, or inquiries',
            ru: 'Оставить вопрос, обращение или запрос',
          },
          {
            ka: 'დახმარება შესაბამის საკითხზე',
            en: 'Assistance regarding your issue',
            ru: 'Помощь по интересующему вопросу',
          },
          {
            ka: 'ერთიანი საკომუნიკაციო არხი',
            en: 'A single communication channel',
            ru: 'Единый канал коммуникации',
          },
          {
            ka: 'დროული უკუკავშირი მიმართვის მიხედვით',
            en: 'Timely feedback on your request',
            ru: 'Своевременную обратную связь по обращению',
          },
        ],
      },
      {
        icon: 'arrow',
        wide: true,
        title: { ka: 'როგორ მუშაობს', en: 'How it works', ru: 'Как это работает' },
        steps: [
          {
            title: { ka: 'დაფიქსირება', en: 'Submit', ru: 'Обращение' },
            text: {
              ka: 'მომხმარებელი აფიქსირებს მოთხოვნას Contact Centre-ის საშუალებით.',
              en: 'The customer submits a request through the Contact Centre.',
              ru: 'Клиент оставляет обращение через Contact Centre.',
            },
          },
          {
            title: { ka: 'დამუშავება', en: 'Processing', ru: 'Обработка' },
            text: {
              ka: 'საკონტაქტო ცენტრი ამუშავებს მიღებულ ინფორმაციას.',
              en: 'The Contact Centre processes the received information.',
              ru: 'Contact Centre обрабатывает полученную информацию.',
            },
          },
          {
            title: { ka: 'შესრულება', en: 'Resolution', ru: 'Решение' },
            text: {
              ka: 'მოთხოვნა სრულდება ან გადამისამართდება შესაბამის დეპარტამენტთან.',
              en: 'The request is completed or forwarded to the appropriate department.',
              ru: 'Обращение выполняется или направляется в соответствующий отдел.',
            },
          },
          {
            title: { ka: 'უკუკავშირი', en: 'Feedback', ru: 'Обратная связь' },
            text: {
              ka: 'მომხმარებელი იღებს უკუკავშირს და საჭირო დახმარებას.',
              en: 'The customer receives feedback and the necessary assistance.',
              ru: 'Клиент получает обратную связь и необходимую помощь.',
            },
          },
        ],
      },
    ],
    banner: {
      ka: 'Contact Centre - თქვენი კომუნიკაციის მარტივი გზა ORBI GROUP-თან.',
      en: 'Contact Centre - your simple way to communicate with ORBI GROUP.',
      ru: 'Contact Centre - простой путь для общения с ORBI GROUP.',
    },
    footer: {
      ka: 'სწრაფი კოორდინაცია და ოპერატიული რეაგირება - 24/7',
      en: 'Fast coordination and prompt response - 24/7',
      ru: 'Быстрая координация и оперативное реагирование - 24/7',
    },
  },
]

export function guideBySlug(slug) {
  return GUIDES.find((g) => g.slug === slug)
}
