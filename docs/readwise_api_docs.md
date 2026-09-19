<!-- https://readwise.io/api_deets -->

## Authentication

Set a header with key "Authorization" and value: "Token XXX" where XXX is your Readwise access token. You (or your users) can get that from here: [readwise.io/access_token](https://readwise.io/access_token)

If you want to check that a token is valid, just make a GET request to `https://readwise.io/api/v2/auth/` with the above header. You should receive a `204` response.

## Rate Limiting

The default base rate is 240 requests per minute (per access token) but the `Highlight LIST` and `Book LIST` endpoints are restricted to 20 per minute (per access token). You can check `Retry-After` header in the 429 response to get the amount of seconds to wait for.

---

## Highlight CREATE

If you want to save highlights to a user's Readwise account from your own application, this is the only endpoint you should need.

---

**Request**: `POST` to `https://readwise.io/api/v2/highlights/`

---

**Parameters:** A JSON object with the key `highlights`, pointing to an array of objects, each with these keys:

Key

Type

Description

Required

text

string

The highlight text, (technically the only field required in a highlight object)
Maximum length: 8191 characters.

yes

title

string

Title of the book/article/podcast (the "source")
Maximum length: 511 characters.

no

author

string

Author of the book/article/podcast (the "source")
Maximum length: 1024 characters.

no

image_url

string

The url of a cover image for this book/article/podcast (the "source")
Maximum length: 2047 characters.

no

source_url

string

The url of the article/podcast (the "source")
Maximum length: 2047 characters.

no

source_type

string

A meaningful unique identifier for your app (string between 3 and 64 chars, no spaces).
Example: `my_app`.
(Note: for legacy integrations book/article/podcast can also be passed here, but it is not recommended anymore.)
Maximum length: 64 characters.

no

category

string

One of: `books`, `articles`, `tweets` or `podcasts`. This will determine where the highlight shows in the user's dashboard and some aspects of how we render it.
If category is not provided we will assume that the category is either `articles` (if source_url is provided) or (otherwise) a `books`.

no

note

string

Annotation note attached to the specific highlight.
You can also use this field to create tags thanks to our [inline tagging](https://blog.readwise.io/tag-your-highlights-while-you-read/) functionality.
Please note that inline tagging does not recreate tags after they have been deleted.
Maximum length: 8191 characters.

no

location

integer

Highlight's location in the source text. Used to order the highlights.
If not provided we will fill this based on the order of highlights in the list.
If location_type is `time_offset`, we interpret the integer as number of seconds that elapsed from the start of the recording.

no

location_type

string

One of: `page`, `location`, `none`, `order`, `offset` or `time_offset`
Default is `order`. If provided type is different than "order", make sure to provide location as well (see below).

no

highlighted_at

string

A datetime representing when the highlight was taken in the ISO 8601 format; default timezone is UTC.
Example: `"2020-07-14T20:11:24+00:00"`

no

highlight_url

string

**Unique** url of the specific highlight (eg. a concrete tweet or a podcast snippet)
Maximum length: 4095 characters.

no

The `highlights` array can be length 1+ and each highlight can be from the same or multiple books/articles. If you don't include a title, we'll put the highlight in a generic "Quotes" book, and if you don't include an author we'll keep it blank or just use the URL domain (if a `source_url` was provided).

Finally, **we de-dupe highlights by title/author/text/source_url**. So if you send a highlight with those 4 things the same (including nulls) then it will do nothing rather than create a "duplicate".

You can also use this endpoint to easily update a previously created highlight if a `highlight_url` was set. Pass the same url with a new text and the highlight's text will be updated.

---

**Response:**

- Status code: `200`
- List of created/updated books/articles/podcasts:

```

[
  {
    "id": 111,
    "title": "Moby Dick",
    "author": "Herman Melville",
    "category": "books",
    "source": "api_book",
    "num_highlights": 2,
    "last_highlight_at": null,
    "updated": "2020-10-08T12:00:22.447912Z",
    "cover_image_url": "https://readwise.io/static/images/default-book-icon-0.png",
    "highlights_url": "https://readwise.io/bookreview/111",
    "source_url": null,
    "asin": null,
    "tags": [],
    "document_note": "",
    "resurface_weighting": 1.0,
    "source_syncs_all_books_together": false,
    "modified_highlights": [
      1337
    ]
  }
]

```

Note that under `modified_highlights` key you can obtain ids of the highlights that were created or updated directly by your request.

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/',
  type: 'POST',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
    },
  data: JSON.stringify({
  'highlights': [
    {
      // A highlight in a book
      'text': 'Call me Ishmael',
      'title': 'Moby Dick',
      'author': 'Herman Melville',
    },
    {
      // Another highlight, later in the same book
      'text': "...but don't ever call me an octopus",
      'title': 'Moby Dick',
      'author': 'Herman Melville',
    },
  ],
  }),
  success: function (result) {console.log(result)},
  error: function (error) {console.log(error)},
});

```

Another example of different use cases:

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/',
  type: 'POST',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
    },
  data: JSON.stringify({
  'highlights': [
    {
      // A highlight from an article,
      // with an attached note the user made.
      'text': 'To be happy I think you have to be doing... ',
      'title': 'How to Do What You Love',
      'author': 'Paul Graham',
      'source_url': 'http://www.paulgraham.com/love.html',
      'source_type': 'my_app',
      'category': 'articles',
      'note': 'Love this quote',
    },
    {
      // Minimal example: just a text highlight.
      // By default, this will be put into a generic "Quotes" book.
      'text': 'My lovely passage',
    },
  ],
  }),
  success: function (result) {console.log(result)},
  error: function (error) {console.log(error)},
});

```

- Python

```

import requests
requests.post(
    url="https://readwise.io/api/v2/highlights/",
    headers={"Authorization": "Token XXX"},
    json={
        "highlights": [{
            "text": "Call me Ishmael",
            "title": "Moby Dick",
            "author": "Herman Melville",
            "source_type": "my_reading_app",
            "category": "books",
            "location_type": "page",
            "location": 3,
            "highlighted_at": "2020-07-14T20:11:24+00:00",
        }]
    }
)

```

- Bash

```

$ curl --request POST --url https://readwise.io/api/v2/highlights/ \
  -H 'Authorization: Token XXX' -H 'Content-Type: application/json' \
  --data '{"highlights":[{"text": "Call me Ishmael","title": "Moby Dick","author": "Herman Melville"}]}'

< HTTP/1.1 200 OK
[{"title":"Moby Dick","highlights_url":"https://readwise.io/bookreview/123"}]

```

## Highlight EXPORT

If you want to pull all of the highlights from a user's account into your service (eg notetaking apps, backups, etc) this endpoint is all you need!

**Request**: `GET` to `https://readwise.io/api/v2/export/`

**Parameters:**

- `updatedAfter` – (Optional, Formatted as ISO 8601 date) Fetch only highlights updated after this date.
- `ids` – (Optional) Comma-separated list of `user_book_id`s, returns all highlights for these books only.
- `includeDeleted` – (Optional) If set to `true`, returns all highlights, including deleted. Use it to synchronize deletions to your app.
- `pageCursor` – (Optional) A string returned by a previous request to this endpoint. Use it to get the next page of books/highlights if there are too many for one request.

The recommended way to use this endpoint is to first sync all of a user's historical data by passing no parameters on the first request, then pageCursor until there are no pages left. Then later, if you want to pull newly updated highlights, just pass updatedAfter as the time you last pulled data. This is shown in the examples on the right. All dates used/returned are in UTC.

The `external_id` field serves as a reference to the User Book in the source system it was imported from. This field is currently available only when `source` is `reader`.

**Response:**

- Status code: `200`

```

{
	"count": 2,
	"nextPageCursor": null,
	"results": [
		{
			"user_book_id": 123,
			"is_deleted": false,
			"title": "Some title",
			"author": "Some author",
			"readable_title": "Some title",
			"source": "raindrop",
			"cover_image_url": "https://cover.com/image.png",
			"unique_url": "",
			"book_tags": [],
			"category": "articles",
			"document_note": "",
			"summary": "",
			"readwise_url": "https://readwise.io/bookreview/123",
			"source_url": "",
			"external_id": "01arz3ndektsv4rrffq69g5fav",
			"asin": null,
			"highlights": [
				{
					"id": 456,
			        "is_deleted": false,
					"text": "“XPTO.”",
					"location": 1,
					"location_type": "order",
					"note": null,
					"color": "yellow",
					"highlighted_at": "2022-09-13T16:41:53.186Z",
					"created_at": "2022-09-13T16:41:53.186Z",
					"updated_at": "2022-09-14T18:50:30.564Z",
					"external_id": "6320b2bd7fbcdd7b0c000b3e",
					"end_location": null,
					"url": null,
					"book_id": 123,
					"tags": [],
					"is_favorite": false,
					"is_discard": false,
					"readwise_url": "https://readwise.io/open/456"
				},
				{
					"id": 890,
			        "is_deleted": false,
					"text": "Foo Bar.",
					"location": 2,
					"location_type": "order",
					"note": null,
					"color": "yellow",
					"highlighted_at": "2022-09-13T16:41:53.186Z",
					"created_at": "2022-09-13T16:41:53.186Z",
					"updated_at": "2022-09-14T18:50:30.568Z",
					"external_id": "6320b2c77fbcdde217000b3f",
					"end_location": null,
					"url": null,
					"book_id": 123,
					"tags": [],
					"is_favorite": false,
					"is_discard": false,
					"readwise_url": "https://readwise.io/open/890"
				}
			]
		}
	]
}

```

**Usage/Examples:**

- JavaScript

```

const token = "XXX"; // use your access token here

const fetchFromExportApi = async (updatedAfter=null) => {
    let fullData = [];
    let nextPageCursor = null;

    while (true) {
      const queryParams = new URLSearchParams();
      if (nextPageCursor) {
        queryParams.append('pageCursor', nextPageCursor);
      }
      if (updatedAfter) {
        queryParams.append('updatedAfter', updatedAfter);
      }
      console.log('Making export api request with params ' + queryParams.toString());
      const response = await fetch('https://readwise.io/api/v2/export/?' + queryParams.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      const responseJson = await response.json();
      fullData.push(...responseJson['results']);
      nextPageCursor = responseJson['nextPageCursor'];
      if (!nextPageCursor) {
        break;
      }
    }
    return fullData;
};

// Get all of a user's books/highlights from all time
const allData = await fetchFromExportApi();

// Later, if you want to get new highlights updated since your last fetch of allData, do this.
const lastFetchWasAt = new Date(Date.now() - 24 * 60 * 60 * 1000);  // use your own stored date
const newData = await fetchFromExportApi(lastFetchWasAt.toISOString());


```

- Python

```

import datetime
import requests  # This may need to be installed from pip

token = 'XXX'

def fetch_from_export_api(updated_after=None):
    full_data = []
    next_page_cursor = None
    while True:
        params = {}
        if next_page_cursor:
            params['pageCursor'] = next_page_cursor
        if updated_after:
            params['updatedAfter'] = updated_after
        print("Making export api request with params " + str(params) + "...")
        response = requests.get(
            url="https://readwise.io/api/v2/export/",
            params=params,
            headers={"Authorization": f"Token {token}"}, verify=False
        )
        full_data.extend(response.json()['results'])
        next_page_cursor = response.json().get('nextPageCursor')
        if not next_page_cursor:
            break
    return full_data

# Get all of a user's books/highlights from all time
all_data = fetch_from_export_api()

# Later, if you want to get new highlights updated since your last fetch of allData, do this.
last_fetch_was_at = datetime.datetime.now() - datetime.timedelta(days=1)  # use your own stored date
new_data = fetch_from_export_api(last_fetch_was_at.isoformat())


```

## Daily Review LIST

Returns highlights from your latest daily review.

If no daily review exists, returns `404` with `{"detail": "Review not found."}`.

**Request**: `GET` to `https://readwise.io/api/v2/review/`

**Response:**

- Status code: `200`

```

{
	"review_id": 877266693,
	"review_url": "https://readwise.io/reviews/877266693",
	"review_completed": false,
	"highlights": [
		{
			"text": "Few of the great creators have bland personalities. They are cantankerous egotists, the kind of men who are unwelcome in  the modern corporation. Consider Winston Churchill. He drank like a fish. He was capricious and wilful. When opposed, he sulked. He was rude to fools. He was wildly extravagant. He wept on the slightest provocation. His conversation was Rabelaisian.\n\nHe was inconsiderate to his staff. Yet Lord Alanbrooke, his Chief of Staff, could write:\n\nI shall always look back on the years I worked with him as some of the most difficult and trying ones in my life. For all that I thank God that I was given the opportunity of working alongside of such a man, and of having my eyes opened to the fact that occasionally such supermen exist on this earth.",
			"title": "Confessions of an Advertising Man",
			"author": "David  Ogilvy",
			"url": null,
			"source_url": null,
			"source_type": "book",
			"category": null,
			"location_type": "page",
			"location": 45,
			"note": "On great creators and Churchill",
			"highlighted_at": "2023-05-31T14:47:36.344000Z",
			"highlight_url": null,
			"image_url": "https://m.media-amazon.com/images/I/51iTic+feKL.jpg",
			"id": 539866941,
			"api_source": null
		},
        ...
    ]
}

```

**Usage/Examples:**

- JavaScript

```

const token = "XXX"; // use your access token here

const fetchDailyReview = async () => {
    let fullData = [];
    let nextPageCursor = null;

    const response = await fetch('https://readwise.io/api/v2/review/', {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
        },
    });
    const responseJson = await response.json();
    return responseJson;
};

const dailyReviewHighlights = await fetchDailyReview();

```

- Python

```

import requests  # This may need to be installed from pip

token = 'XXX'

def fetch_daily_review():
    response = requests.get(
        url="https://readwise.io/api/v2/review/",
        headers={"Authorization": f"Token {token}"}, verify=False
    )
    return response.json()

daily_review_highlights = fetch_daily_review()

```

## Daily Review Complete

Marks a daily review complete.

**Request**: `POST` to `https://readwise.io/api/v2/review/complete/`

**Response:**

- Status code: `200`

```

{
	"review_id": 877266693,
	"review_completed": true
}

```

**Usage/Examples:**

- JavaScript

```

const token = "XXX"; // use your access token here

const markDailyReviewComplete = async () => {
    const response = await fetch('https://readwise.io/api/v2/review/complete/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
        },
    });
    return await response.json();
};

const completedReview = await markDailyReviewComplete();

```

- Python

```

import requests  # This may need to be installed from pip

token = 'XXX'

def mark_daily_review_complete():
    response = requests.post(
        url="https://readwise.io/api/v2/review/complete/",
        headers={"Authorization": f"Token {token}"}
    )
    return response.json()

completed_review = mark_daily_review_complete()

```

# Advanced API

The Highlight CREATE and EXPORT endpoints above should be sufficient for almost all usecases that either want to create or export books/highlights. The below endpoints can be used for more complex integrations, that might want to carefully read, query, update, or delete a user's highlights.

## Highlights LIST

**Request**: `GET` to `https://readwise.io/api/v2/highlights/`

**Parameters:** Usual query params:

- `page_size` – specify number of results per page (default is 100, max is 1000)
- `page` – specify the pagination counter
- `book_id` – return highlights of a specifed book (for obtaining book ids, see section below)
- `updated__lt` – filter by last updated datetime (less than)
- `updated__gt` – filter by last updated datetime (greater than)
- `highlighted_at__lt` – filter by the time when highlight was taken (NOTE that some highlights may not have value set)
- `highlighted_at__gt` – filter by the time when highlight was taken (NOTE that some highlights may not have value set)

**Response:**

- Status code: `200`
- A list of highlights with a pagination metadata:

```

{
  "count": 1163,
  "next": "https://readwise.io/api/v2/highlights?page=2",
  "previous": null,
  "results": [
    {
      "id": 59758950,
      "text": "The fundamental belief of metaphysicians is THE BELIEF IN ANTITHESES OF VALUES.",
      "note": "",
      "location": 9,
      "location_type": "order",
      "highlighted_at": null,
      "created_at": "2020-10-01T12:58:44.716235Z",
      "url": null,
      "color": "",
      "updated": "2020-10-01T12:58:44.716235Z",
      "book_id": 2608248,
      "external_id": null,
      "tags": [
        {
           "id": 123456,
           "name": "philosophy"
        },
        ...
      ],
      "end_location": null,
      "readwise_url": "https://readwise.io/open/59758950"
    },
    ...
  ]
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: {"page_size": 10},
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

# getting highlights from a particular book
# made after February 1st, 2020, 21:35:53 UTC
querystring = {
    "book_id": 1337,
    "highlighted_at__gt": "2020-02-01T21:35:53Z",
}

response = requests.get(
    url="https://readwise.io/api/v2/highlights/",
    headers={"Authorization": "Token XXX"},
    params=querystring
)

data = response.json()

```

## Highlight DETAIL

**Request**: `GET` to `https://readwise.io/api/v2/highlights/<highlight id>/`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `200`
- Representation of a specific highlight:

```

{
  "id": 13,
  "text": "To be alone for any length of time is to shed an outer skin. The...",
  "note": "",
  "location": 57,
  "location_type": "location",
  "highlighted_at": "2020-02-02T16:46:07Z",
  "created_at": "2020-02-02T16:46:07Z",
  "url": null,
  "color": "yellow",
  "updated": "2020-04-06T12:30:52.318552Z",
  "book_id": 1337,
  "external_id": null,
  "tags": [],
  "end_location": null,
  "readwise_url": "https://readwise.io/open/13"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/13/',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/highlights/13/",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Highlight UPDATE

**Request**: `PATCH` to `https://readwise.io/api/v2/highlights/<highlight id>/`

**Parameters:** A JSON object with one or more of the following keys:

Key

Type

Description

Required

text

string

The highlight text, (technically the only field required in a highlight object)

no

note

string

Annotation note attached to the specific highlight

no

location

string

Highlight's location in the source text. Used to order the highlights. If not provided we will fill this based on the order of highlights in the list. If location_type is `time_offset`, we interpret the integer as number of seconds that elapsed from the start of the recording.

no

url

string

Unique url of the specific highlight (eg. a concrete tweet or a podcast snippet)

no

color

string

Highlight's color tag. One of: yellow, blue, pink, orange, green, purple.

no

**Response:**

- Status code: `200`
- The detail representation of patched highlight:

              `{   "id": 13,   "text": "To be alone for any length of time is to shed an outer skin. The...",   "note": "",   "location": 57,   "location_type": "location",   "highlighted_at": "2020-02-02T16:46:07Z",   "created_at": "2020-02-02T16:46:07Z",   "url": null,   "color": "orange",   "updated": "2020-04-06T12:30:52.318552Z",   "book_id": 1337,   "external_id": null,   "tags": [],   "end_location": null,   "readwise_url": "https://readwise.io/open/13" }`

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/13/',
  type: 'PATCH',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: JSON.stringify({
    "color": "green",
    "note": "This makes me think of what Marcus Aurelius wrote"
  }),
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

payload = {
    "color": "green",
    "note": "This makes me think of what Marcus Aurelius wrote",
}

response = requests.patch(
    url="https://readwise.io/api/v2/highlights/13/",
    headers={"Authorization": "Token XXX"},
    data=payload
)

data = response.json()

```

## Highlight DELETE

**Request**: `DELETE` to `https://readwise.io/api/v2/highlights/<highlight id>/`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `204`

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/13/',
  type: 'DELETE',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.delete(
    url="https://readwise.io/api/v2/highlights/13/",
    headers={"Authorization": "Token XXX"},
)

```

## Highlight Tags LIST

**Request**: `GET` to `https://readwise.io/api/v2/highlights/<highlight id>/tags`

**Parameters:** Usual query params:

- `page_size` – specify number of results per page (default is 100, max is 1000)
- `page` – specify the pagination counter

**Response:**

- Status code: `200`
- A list of highlight's tags with a pagination metadata:

```

{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 11311390,
      "name": "philosophy"
    }
  ]
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/59767830/tags',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/highlights/59767830/tags",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Highlight Tag DETAIL

**Request**: `GET` to `https://readwise.io/api/v2/highlights/<highlight id>/tags/<tag id>`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `200`
- Highlight's tag:

```

{
  "id": 11311390,
  "name": "philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/59767830/tags/11311390',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/highlights/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Highlight Tag CREATE

**Request**: `POST` to `https://readwise.io/api/v2/highlights/<highlight id>/tags/`

**Parameters:** A JSON object with the following key:

Key

Type

Description

Required

name

string

The tag's name. Maximum length: 127 characters.

yes

**Response:**

- Status code: `200`
- Highlight's tag:

```

{
  "id": 11311390,
  "name": "philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/59767830/tags',
  type: 'POST',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: JSON.stringify({
    "name": "philosophy",
  }),
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

requests.post(
    url="https://readwise.io/api/v2/highlights/59767830/tags",
    headers={"Authorization": "Token XXX"},
    json={"name": "philosophy"}
)

data = response.json()

```

## Highlight Tag UPDATE

**Request**: `PATCH` to `https://readwise.io/api/v2/highlights/<highlight id>/tags/<tag id>`

**Parameters:** A JSON object with the following key:

Key

Type

Description

Required

name

string

The tag's name.

yes

**Response:**

- Status code: `200`
- Updated highlight's tag:

```

{
  "id": 11311390,
  "name": "continental philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/59767830/tags/11311390',
  type: 'PATCH',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: JSON.stringify({
    "name": "continental philosophy",
  }),
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

requests.patch(
    url="https://readwise.io/api/v2/highlights/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
    json={"name": "continental philosophy"}
)

data = response.json()

```

## Highlight Tag DELETE

**Request**: `DELETE` to `https://readwise.io/api/v2/highlights/<highlight id>/tags/<tag id>`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `204`

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/highlights/59767830/tags/11311390',
  type: 'DELETE',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.delete(
    url="https://readwise.io/api/v2/highlights/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
)

```

## Books LIST

**Request**: `GET` to `https://readwise.io/api/v2/books/`

**Parameters:** Usual query params:

- `page_size` – specify number of results per page (default is 100, max is 1000)
- `page` – specify the pagination counter
- `category` – return books within a specified category (`books`, `articles`, `tweets`, `supplementals` or `podcasts`)
- `source` – return books from a specified source
- `updated__lt` – filter by last updated datetime (less than)
- `updated__gt` – filter by last updated datetime (greater than)
- `last_highlight_at__lt` – filter by the time when highlight was taken (NOTE that some books may not have this value set)
- `last_highlight_at__gt` – filter by the time when highlight was taken (NOTE that some books may not have this value set)

**Response:**

- Status code: `200`
- A list of books with a pagination metadata:

```

{
  "count": 9,
  "next": "https://readwise.io/api/v2/books/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1776,
      "title": "Early Retirement Extreme",
      "author": "Jacob Lund Fisker",
      "category": "books",
      "source": "kindle",
      "num_highlights": 68,
      "last_highlight_at": "2019-03-19T03:49:23Z",
      "updated": "2020-10-01T17:47:31.234826Z",
      "cover_image_url": "https://readwise.io/static/images/default-book-icon-2.png",
      "highlights_url": "https://readwise.io/bookreview/1776",
      "source_url": null,
      "asin": "B0046LU7H0",
      "tags": [],
      "document_note": "",
      "resurface_weighting": 1.0,
      "source_syncs_all_books_together": true
    },
    {
      "id": 1826,
      "title": "What Is the Point of Universal Basic Income?",
      "author": "David Perell",
      "category": "articles",
      "source": "api_article",
      "num_highlights": 3,
      "last_highlight_at": "2020-02-03T09:51:17Z",
      "updated": "2020-03-17T06:44:44.601570Z",
      "cover_image_url": "https://readwise.io/static/images/article4.png",
      "highlights_url": "https://readwise.io/bookreview/1826",
      "source_url": "https://perell.com/fellowship-essay/universal-basic-income",
      "asin": null,
      "tags": [],
      "document_note": "",
      "resurface_weighting": 0.5,
      "source_syncs_all_books_together": false
    },
    ...
  ]
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: {"page_size": 500, "category": "articles"},
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import datetime
import requests

# getting books that were updated last week

a_week_ago = datetime.datetime.now() - datetime.timedelta(days=7)

querystring = {
    "category": "books",
    "updated__gt": a_week_ago.strftime("%Y-%m-%dT%H:%M:%SZ"),
}

response = requests.get(
    url="https://readwise.io/api/v2/books/",
    headers={"Authorization": "Token XXX"},
    params=querystring
)

data = response.json()

```

## Book DETAIL

**Request**: `GET` to `https://readwise.io/api/v2/books/<book id>/`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `200`
- A book representation:

```


{
  "id": 1776,
  "title": "Early Retirement Extreme",
  "author": "Jacob Lund Fisker",
  "category": "books",
  "source": "kindle",
  "num_highlights": 68,
  "last_highlight_at": "2019-03-19T03:49:23Z",
  "updated": "2020-10-01T17:47:31.234826Z",
  "cover_image_url": "https://readwise.io/static/images/default-book-icon-2.png",
  "highlights_url": "https://readwise.io/bookreview/1776",
  "source_url": null,
  "asin": "B0046LU7H0",
  "tags": [],
  "document_note": ""
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/1776/',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/books/1776/",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Book Tags LIST

**Request**: `GET` to `https://readwise.io/api/v2/books/<book id>/tags`

**Parameters:** Usual query params:

- `page_size` – specify number of results per page (default is 100, max is 1000)
- `page` – specify the pagination counter

**Response:**

- Status code: `200`
- A list of book's tags with a pagination metadata:

```

{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 11311390,
      "name": "philosophy"
    }
  ]
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/59767830/tags',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/books/59767830/tags",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Book Tag DETAIL

**Request**: `GET` to `https://readwise.io/api/v2/books/<book id>/tags/<tag id>`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `200`
- Highlight's tag:

```

{
  "id": 11311390,
  "name": "philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/59767830/tags/11311390',
  type: 'GET',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.get(
    url="https://readwise.io/api/v2/books/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
)

data = response.json()

```

## Book Tag CREATE

**Request**: `POST` to `https://readwise.io/api/v2/books/<book id>/tags/`

**Parameters:** A JSON object with the following key:

Key

Type

Description

Required

name

string

The tag's name. Maximum length: 512 characters.

yes

**Response:**

- Status code: `200`
- Book's tag:

```

{
  "id": 11311390,
  "name": "philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/59767830/tags',
  type: 'POST',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: JSON.stringify({
    "name": "philosophy",
  }),
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

requests.post(
    url="https://readwise.io/api/v2/books/59767830/tags",
    headers={"Authorization": "Token XXX"},
    json={"name": "philosophy"}
)

data = response.json()

```

## Book Tag UPDATE

**Request**: `PATCH` to `https://readwise.io/api/v2/books/<book id>/tags/<tag id>`

**Parameters:** A JSON object with the following key:

Key

Type

Description

Required

name

string

The tag's name.

yes

**Response:**

- Status code: `200`
- Updated highlight's tag:

```

{
  "id": 11311390,
  "name": "continental philosophy"
}

```

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/59767830/tags/11311390',
  type: 'PATCH',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  data: JSON.stringify({
    "name": "continental philosophy",
  }),
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

requests.patch(
    url="https://readwise.io/api/v2/books/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
    json={"name": "continental philosophy"}
)

data = response.json()

```

## Book Tag DELETE

**Request**: `DELETE` to `https://readwise.io/api/v2/books/<book id>/tags/<tag id>`

**Parameters:**
This endpoint doesn't take any parameters.

**Response:**

- Status code: `204`

**Usage/Examples:**

- JavaScript

```

$.ajax({
  url: 'https://readwise.io/api/v2/books/59767830/tags/11311390',
  type: 'DELETE',
  contentType: 'application/json',
  beforeSend: function (xhr) {
    xhr.setRequestHeader('Authorization', 'Token XXX');
  },
  success: function (result) {
    console.log(result)
  },
  error: function (error) {
    console.log(error)
  },
});

```

- Python

```

import requests

response = requests.delete(
    url="https://readwise.io/api/v2/books/59767830/tags/11311390",
    headers={"Authorization": "Token XXX"},
)

```
