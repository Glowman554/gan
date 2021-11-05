from tensorflow.keras import layers
import tensorflow as tf
from tensorflow import keras
import os

def generator_model(img_height, img_width, channels):
	inputs = keras.Input(shape=(100,), name='input_layer')
	x = layers.Dense(128, kernel_initializer=tf.keras.initializers.he_uniform, name='dense_1')(inputs)
	x = layers.LeakyReLU(0.2, name='leaky_relu_1')(x)
	x = layers.Dense(256, kernel_initializer=tf.keras.initializers.he_uniform, name='dense_2')(x) 
	x = layers.BatchNormalization(momentum=0.1,  epsilon=0.8, name='bn_1')(x)
	x = layers.LeakyReLU(0.2, name='leaky_relu_2')(x)
	x = layers.Dense(512, kernel_initializer=tf.keras.initializers.he_uniform, name='dense_3')(x) 
	x = layers.BatchNormalization(momentum=0.1,  epsilon=0.8, name='bn_2')(x)
	x = layers.LeakyReLU(0.2, name='leaky_relu_3')(x)
	x = layers.BatchNormalization(momentum=0.1,  epsilon=0.8, name='bn_3')(x)
	x = layers.LeakyReLU(0.2, name='leaky_relu_4')(x)
	x = layers.Dense(img_width * img_height * channels, kernel_initializer=tf.keras.initializers.he_uniform, activation='tanh',  name='dense_4')(x) 
	outputs = tf.reshape(x, [-1, img_height, img_width, channels], name='Reshape_Layer')
	model = tf.keras.Model(inputs, outputs, name="Generator")
	return model

def discriminator_model(img_height, img_width, channels):
	inputs = keras.Input(shape=(img_height, img_width, channels), name='input_layer')
	input = tf.reshape(inputs, [-1, img_width * img_height * channels], name='reshape_layer')
	x = layers.Dense(512, kernel_initializer=tf.keras.initializers.he_uniform, name='dense_1')(input)
	x = layers.LeakyReLU(0.2, name='leaky_relu_1')(x)
	x = layers.Dense(256, kernel_initializer=tf.keras.initializers.he_uniform, name='dense_2')(x) 
	x = layers.LeakyReLU(0.2, name='leaky_relu_2')(x)
	outputs = layers.Dense(1, kernel_initializer=tf.keras.initializers.he_uniform, activation='sigmoid', name='dense_3') (x) 
	model = tf.keras.Model(inputs, outputs, name="Discriminator")
	return model

def load_latest(img_height, img_width, img_channels, model_dir):
	latest_num = 0
	for i in os.listdir(model_dir):
		if i.startswith('generator_model_') and i.endswith('.h5'):
			num = int(i[16:-3])
			if num > latest_num:
				latest_num = num
	
	print('Loading latest model from generator_model_{}.h5'.format(latest_num))

	generator = generator_model(img_height=img_height, img_width=img_width, channels=img_channels)
	generator.load_weights(model_dir +  '/generator_model_{}.h5'.format(latest_num))

	print('Loading latest model from discriminator_model_{}.h5'.format(latest_num))

	discriminator = discriminator_model(img_height=img_height, img_width=img_width, channels=img_channels)
	discriminator.load_weights(model_dir + '/discriminator_model_{}.h5'.format(latest_num))

	return generator, discriminator