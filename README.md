# Lilia

Lilia is a maid. She is dilligent and work quickly.
In other words, Lilia is a containerized media file server with Google Cloud Storage backend 
based on Express.js on Node.js and require MongoDB database for storing file meta data. Lilia will return file URL and any other info if requested. Lilia is supposed to be used as micro service.

### Usage
Just run `docker run -p 9000:9000 -v /host/dir:/configuration --name lilia didasy/lilia` and 
communicate through HTTP on that port. Lilia expose and listen on port 9000 by default.

If you use `api_token` in configuration file, make sure to send it as header `api_token` on request
or it will return 401 error.

### TODOs

- Adding tests
- Volume for key and cert files
- Volume for custom upload page
- Volume for log file
- Prettier default upload page

### Routes

#### / GET

Will return this Lilia's version.
Returns:

```
{
	service: "Lilia",
	version: "v0.0.3-alpha"
}
```

#### /file/upload GET

Will return an ultra simple html page to upload a media file.

#### /file/download POST

Tell Lilia to download an image from a url. Lilia only process media files
and will not save it if the md5 of it already exists in the database.
If the md5 is found but already marked as deleted, Lilia will undelete the file for you.

Request:

```
{
	request_id: String,
	file_url: String
}
```

Returns:

```
{
	request_id: String,
	file_name: String,
	file_url: String,
	file_size: Number,
	file_md5: String,
	file_mime_type: String,
	file_type: String,
	created_at: Date,
	deleted_at: null,
	deletion_request_id: null
}
```

#### /file/upload POST

Upload a file, restricted to media files only (image, video, audio, text.)
Lilia will not save it if she detects that the file md5 already exists in the database.
If the md5 is found but already marked as deleted, Lilia will undelete the file for you.

Request:
`multipart file upload with "media" as the field name and "request_id" field name filled with request id string`

Returns:

```
{
	request_id: String,
	file_name: String,
	file_url: String,
	file_size: Number,
	file_md5: String,
	file_mime_type: String,
	file_type: String,
	created_at: Date,
	deleted_at: null,
	deletion_request_id: null
}
```

#### /file/delete POST

Request:

```
{
	request_id: String,
	file_md5: String, // optional
	file_url: String // optional
}
```

Returns:

```
{
	deleted_at: Date,
	deletion_request_id: String
}
```

#### /file/get POST

Request: 

```
{
	request_id: String,
	file_md5: String, // optional
	file_url: String, // optional
	file_name: String // optional
}
```

#### /file/search POST

Request:

```
{
	request_id: String,
	page: Number,
	per_page: Number,
	sort: { by: String, order: Number }, // optional
	created_from: Date, // optional
	created_to: Date, // optional
	is_deleted: Boolean, // optional
	by_request_id: String, // optional
	by_deletion_request_id: String, // optional
	file_name: String, // optional
	file_mime_type: String, // optional
	file_size_from: Number, // optional
	file_size_to: Number, // optional
	file_type: String // optional
}
```

Response: 

```
[
	{
		request_id: String,
		file_name: String,
		file_url: String,
		file_size: Number,
		file_md5: String,
		file_mime_type: String,
		file_type: String,
		created_at: Date,
		deleted_at: null,
		deletion_request_id: null
	}, 
	...
]
```
