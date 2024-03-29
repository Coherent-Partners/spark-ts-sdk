# Folder API

| API                             | Description                                                           |
| ------------------------------- | --------------------------------------------------------------------- |
| `Spark.folder.getCategories()`  | Get the list of folder categories.                                    |
| `Spark.folder.create(data)`     | Create a new folder using info like name, description, category, etc. |
| `Spark.folder.find(name)`       | Find folders by name, status, category, or favorite.                  |
| `Spark.folder.update(id, data)` | Update a folder's information by id.                                  |
| `Spark.folder.delete(id)`       | Delete a folder by id.                                                |

All the methods return a `Promise` that resolves to an `HttpResponse<T>` object
where `T` is the type of the data returned by the API.

```json
{
  "status": 200,
  "data": {}, // JSON data T returned by the API
  "buffer": null, // Binary array buffer of response body
  "headers": {} // Response headers
}
```

## Get the folder categories

As of now, the platform supports the following folder categories:

```ts
type FolderCategory =
  | 'Medical'
  | 'Critical Illness'
  | 'Lifelong Participation'
  | 'Universal Life'
  | 'Investment Linked'
  | 'Annuity'
  | 'Term'
  | 'VHIS'
  | 'VHIS + Medical'
  | 'Property & Casualty'
  | 'Other';
```

However, there's a chance that the platform will add more categories in the future.
To get the list of folder categories, you can use the following method:

```ts
const response = await spark.folder.getCategories();
```

### Returns

This method returns an array of folder categories with their icons.

```json
{
  "status": "Success",
  "message": null,
  "errorCode": null,
  "data": [
    {
      "key": "Medical",
      "value": "Medical",
      "icon": "medical.svg"
    },
    {
      "key": "Critical Illness",
      "value": "Critical Illness",
      "icon": "criticalillness.svg"
    },
    // ...
    {
      "key": "Other",
      "value": "Other",
      "icon": "other.svg"
    }
  ]
}
```

## Create a new folder

This method allows you to create a new folder by providing a folder name.

[!TIP]

> Remember to choose a folder name that is URL-friendly as it will form part of
> a Spark Service URI. We recommend using lowercase letters and hyphens to separate
> words. Otherwise, special characters like space will be URL-encoded.

### Arguments

You may pass in the folder name as a `string`.

```ts
await spark.folder.create('my-folder');
```

Alternatively, you can pass in the following parameters as an `object`, which
will create a folder with some additional information.

| Property          | Type               | Description                                           |
| ----------------- | ------------------ | ----------------------------------------------------- |
| _name_ (required) | `string`           | The name of the folder (120 characters max)           |
| _description_     | `string`           | The description of the folder.                        |
| _category_        | `FolderCategory`   | The category of the folder.                           |
| _launchDate_      | `string`           | The launch date in `YYYY-MM-DDTHH:MM:SS.SSSZ` format. |
| _startDate_       | `string`           | The start date in `YYYY-MM-DDTHH:MM:SS.SSSZ` format.  |
| _status_          | `string`           | The status of the folder.                             |
| _cover_           | `string \| Buffer` | The cover image of the folder (base64 `string`)       |

```ts
await spark.folder.create({
  name: 'my-folder',
  // Optional parameters
  description: 'This is a folder description',
  category: 'Medical',
  launchDate: new Date().toISOString(),
});
```

<!-- markdownlint-disable-next-line -->

### Returns

When successful, the method returns the folder information.

```json
{
  "status": "Success",
  "data": {
    "folderId": "uuid",
    "get_product_url": "https://excel.{env}.coherent.global/api/v1/product/GetProduct/my-folder"
  },
  "message": null,
  "errorCode": null
}
```

Otherwise, it will throw a `SparkApiError`:

- `UnauthorizedError` when the user is not authenticated.
- `ConflictError` when the folder name already exists.
- `UnknownApiError` when the SDK failed to create the folder due to unknown reasons.

> [!NOTE]
> If you are using API key as your authentication method, the API key needs to
> have permission to create a folder. Otherwise, you will get a `401 Unauthorized` error.
> See [Authentication API](./authentication.md) for more information on how to set up feature
> permissions for API keys.

## Find folders

This method helps find folders by name, status, category, or favorite.

<!-- markdownlint-disable-next-line -->

### Arguments

You may search search a folder by its id.

```ts
await spark.folder.find('uuid');
```

Alternatively, you can pass in the following parameters as an `object` to filter
the folders.

| Property   | Type             | Description                               |
| ---------- | ---------------- | ----------------------------------------- |
| _name_     | `string`         | The name of the folder.                   |
| _category_ | `FolderCategory` | The category of the folder.               |
| _favorite_ | `boolean`        | Whether the folder is marked as favorite. |

```ts
await spark.folder.find({ category: 'Medical', favorite: true });
```

Additional search parameters are available:

| Property | Type     | Description                       |
| -------- | -------- | --------------------------------- |
| _page_   | `number` | The page number.                  |
| _size_   | `number` | The number of items per page.     |
| _sort_   | `string` | The field to sort the folders by. |

```ts
await spark.folder.find({ favorite: true }, { page: 1, size: 10, sort: 'productName' });
```

<!-- markdownlint-disable-next-line -->

### Returns

This method returns an array of folders with their information.

```json
{
  "status": "Success",
  "count": 2,
  "next": null,
  "previous": null,
  "message": null,
  "errorCode": null,
  "data": [
    {
      "id": "uuid",
      "name": "my-folder",
      "status": "Design",
      "category": "Medical",
      "description": "something cool is happening here.",
      "coverImagePath": "uuid",
      "createdAt": "2023-06-30T13:27:38.62016Z",
      "createdBy": "john.doe@coherent.global",
      "lastModifiedDate": "2024-03-19T04:58:06.495676Z",
      "isStarred": true,
      "kanbanStatus": "Test 01",
      "startDate": "2023-06-30T00:00:00Z",
      "launchDate": "2023-09-30T00:00:00Z",
      "activeServiceCount": 0,
      "totalServiceCount": 26
    },
    // ...
    {
      "id": "uuid",
      "name": "my-other-folder",
      "status": "Design",
      "category": "Other",
      "description": "some awesome description.",
      "coverImagePath": null,
      "createdAt": "2023-09-01T17:11:38.381469Z",
      "createdBy": "jane.doe@coherent.global",
      "lastModifiedDate": "2024-01-29T18:41:09.444745Z",
      "isStarred": true,
      "kanbanStatus": "Test 01",
      "startDate": "2023-09-01T00:00:00Z",
      "launchDate": "2023-12-01T00:00:00Z",
      "activeServiceCount": 0,
      "totalServiceCount": 2
    }
  ]
}
```

Check out the [API reference](https://docs.coherent.global/spark-apis/folder-apis/find-folder-by-name)
for more information.

## Update a folder's information

This method allows you to update a folder's information by its id. Once created,
you can only update the folder's description, category, launch date, start date,
or status.

<!-- markdownlint-disable-next-line -->

### Arguments

You must provide the folder id and the updated folder information, just as in
[creating a new folder](#create-a-new-folder).

```ts
await spark.folder.update('uuid', { description: 'Updated description' });
```

<!-- markdownlint-disable-next-line -->

### Returns

When successful, the method returns a successful status.

```json
{
  "status": "Success",
  "data": null,
  "message": null,
  "errorCode": null
}
```

## Delete a folder

This method allows you to delete a folder by its id.

> [!WARNING]
> This method should be used with caution as it will delete the folder and all its
> content, i.e., its services if any.

<!-- markdownlint-disable-next-line -->

### Arguments

You must provide the folder id as `string`.

```ts
await spark.folder.delete('uuid');
```

<!-- markdownlint-disable-next-line -->

### Returns

When successful, the method returns a successful status.

```json
{
  "status": "Success",
  "data": null,
  "message": null,
  "errorCode": null
}
```
