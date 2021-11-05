def apply_common_args(parser):
	parser.add_argument("--img_width", type=int, default=50, help="width of the image")
	parser.add_argument("--img_height", type=int, default=50, help="height of the image")
	parser.add_argument("--img_channels", type=int, default=3, help="channels of the image")