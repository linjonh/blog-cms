export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb', // 设置表单请求大小限制
      jsonLimit: '256mb', // 设置 JSON 请求大小限制
      textLimit: '256mb', // 设置文本请求大小限制
      formidable: {
        maxFileSize: 200 * 1024 * 1024, // 设置文件上传大小限制为 200MB
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
