  var module_209147119213 = (function() {
    [
  {
    "name": "featured_media_type",
    "label": "Highlight Media Type",
    "type": "choice",
    "choices": [
      ["video", "Video"],
      ["image", "Image"]
    ],
    "default": "video"
  },
  {
    "name": "featured_thumbnail",
    "label": "Thumbnail (Image)",
    "type": "image",
    "default": { "src": "", "alt": "" },
    "display_conditions": [
      {
        "controlling_field": "featured_media_type",
        "controlling_value_regex": "image",
        "operator": "MATCHES_REGEX"
      }
    ]
  },
  {
    "name": "featured_video_url",
    "label": "YouTube — Solo el ID del vídeo (ej: dQw4w9WgXcQ)",
    "type": "text",
    "default": "",
    "display_conditions": [
      {
        "controlling_field": "featured_media_type",
        "controlling_value_regex": "video",
        "operator": "MATCHES_REGEX"
      }
    ]
  },
  {
    "name": "featured_hubspot_video",
    "label": "HubSpot Video",
    "type": "hubspot_video",
    "display_conditions": [
      {
        "controlling_field": "featured_media_type",
        "controlling_value_regex": "video",
        "operator": "MATCHES_REGEX"
      }
    ]
  },
  {
    "name": "featured_title",
    "label": "Título",
    "type": "text",
    "default": ""
  },
  {
    "name": "featured_description",
    "label": "Descripción",
    "type": "richtext",
    "default": ""
  },
  {
    "name": "featured_cta_url",
    "label": "CTA — Enlace",
    "type": "link",
    "default": {
      "url": {
        "href": "",
        "type": "EXTERNAL"
      },
      "open_in_new_tab": false
    }
  },
  {
    "name": "featured_cta_label",
    "label": "CTA — Texto",
    "type": "text",
    "default": "Leer caso de éxito"
  },
  {
  "name": "feature_chip_text",
  "label": "Chip — Texto",
  "type": "text",
  "default": "Historia destacada"
}
]
  })();
